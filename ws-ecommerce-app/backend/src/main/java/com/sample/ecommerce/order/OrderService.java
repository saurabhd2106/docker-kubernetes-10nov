package com.sample.ecommerce.order;

import com.sample.ecommerce.auth.User;
import com.sample.ecommerce.cart.Cart;
import com.sample.ecommerce.cart.CartItem;
import com.sample.ecommerce.cart.CartService;
import com.sample.ecommerce.catalog.Product;
import com.sample.ecommerce.catalog.ProductRepository;
import com.sample.ecommerce.common.ApiException;
import com.sample.ecommerce.promo.PromoService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartService cartService;
    private final DummyPaymentService paymentService;
    private final PromoService promoService;
    private final ProductRepository productRepository;

    public OrderService(
            OrderRepository orderRepository,
            CartService cartService,
            DummyPaymentService paymentService,
            PromoService promoService,
            ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.cartService = cartService;
        this.paymentService = paymentService;
        this.promoService = promoService;
        this.productRepository = productRepository;
    }

    @Transactional
    public OrderDtos.OrderResponse checkout(User user, OrderDtos.CheckoutRequest request) {
        Cart cart = cartService.getOrCreateCart(user);
        if (cart.getItems().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CART_EMPTY", "Cart is empty");
        }

        for (CartItem cartItem : cart.getItems()) {
            cartService.ensureStock(cartItem.getProduct(), cartItem.getQuantity());
        }

        int subtotal = cart.getItems().stream()
                .mapToInt(item -> item.getProduct().getPriceCents() * item.getQuantity())
                .sum();
        int discount = 0;
        String promoCode = cart.getPromoCode();
        if (promoCode != null && !promoCode.isBlank()) {
            discount = promoService.discountFor(promoCode, subtotal);
        }
        int total = Math.max(0, subtotal - discount);

        // Charge first so a declined card leaves stock and promo untouched.
        String last4 = paymentService.charge(
                request.cardNumber(),
                request.cardExpiry(),
                request.cardCvv(),
                request.cardName()
        );

        ShopOrder order = new ShopOrder();
        order.setUser(user);
        order.setStatus("PAID");
        order.setCardLast4(last4);
        order.setShippingName(request.shippingName().trim());
        order.setShippingLine1(request.shippingLine1().trim());
        order.setShippingCity(request.shippingCity().trim());
        order.setShippingRegion(request.shippingRegion().trim());
        order.setShippingPostal(request.shippingPostal().trim());
        order.setSubtotalCents(subtotal);
        order.setDiscountCents(discount);
        order.setTotalCents(total);
        order.setPromoCode(promoCode);

        List<OrderItem> orderItems = new ArrayList<>();
        for (CartItem cartItem : cart.getItems()) {
            Product product = cartItem.getProduct();
            cartService.ensureStock(product, cartItem.getQuantity());
            product.setStockQuantity(product.getStockQuantity() - cartItem.getQuantity());
            productRepository.save(product);

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setProductName(product.getName());
            item.setUnitPriceCents(product.getPriceCents());
            item.setQuantity(cartItem.getQuantity());
            orderItems.add(item);
        }
        order.setItems(orderItems);

        ShopOrder saved = orderRepository.save(order);
        cartService.clearCart(cart);
        return toResponse(saved);
    }

    @Transactional
    public OrderDtos.OrderResponse cancelOrder(User user, Long id) {
        ShopOrder order = orderRepository.findByIdAndUserWithItems(id, user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found"));
        if (!"PAID".equals(order.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_CANCELLABLE", "Only paid orders can be cancelled");
        }
        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            if (product != null) {
                product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
                productRepository.save(product);
            }
        }
        order.setStatus("CANCELLED");
        return toResponse(orderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public List<OrderDtos.OrderResponse> listOrders(User user) {
        return orderRepository.findByUserWithItems(user).stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderDtos.OrderResponse getOrder(User user, Long id) {
        ShopOrder order = orderRepository.findByIdAndUserWithItems(id, user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found"));
        return toResponse(order);
    }

    private OrderDtos.OrderResponse toResponse(ShopOrder order) {
        List<OrderDtos.OrderItemResponse> items = order.getItems().stream()
                .map(item -> new OrderDtos.OrderItemResponse(
                        item.getId(),
                        item.getProductName(),
                        item.getUnitPriceCents(),
                        item.getQuantity(),
                        item.getUnitPriceCents() * item.getQuantity()
                ))
                .toList();
        return new OrderDtos.OrderResponse(
                order.getId(),
                order.getStatus(),
                order.getSubtotalCents(),
                order.getDiscountCents(),
                order.getTotalCents(),
                order.getPromoCode(),
                order.getCardLast4(),
                order.getShippingName(),
                order.getShippingLine1(),
                order.getShippingCity(),
                order.getShippingRegion(),
                order.getShippingPostal(),
                order.getCreatedAt(),
                items
        );
    }
}
