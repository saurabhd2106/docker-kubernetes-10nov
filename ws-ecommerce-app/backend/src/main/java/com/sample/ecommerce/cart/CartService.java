package com.sample.ecommerce.cart;

import com.sample.ecommerce.auth.User;
import com.sample.ecommerce.catalog.Product;
import com.sample.ecommerce.catalog.ProductRepository;
import com.sample.ecommerce.common.ApiException;
import com.sample.ecommerce.promo.PromoService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final PromoService promoService;

    public CartService(
            CartRepository cartRepository,
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            PromoService promoService) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.promoService = promoService;
    }

    @Transactional
    public CartDtos.CartResponse getCart(User user) {
        return toResponse(getOrCreateCart(user));
    }

    @Transactional
    public CartDtos.CartResponse addItem(User user, CartDtos.AddItemRequest request) {
        Cart cart = getOrCreateCart(user);
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found"));

        if (product.getStockQuantity() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OUT_OF_STOCK", "Product is out of stock");
        }

        CartItem existing = cart.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(product.getId()))
                .findFirst()
                .orElse(null);

        int desired = request.quantity();
        if (existing != null) {
            desired = existing.getQuantity() + request.quantity();
        }
        desired = Math.min(99, desired);
        ensureStock(product, desired);

        if (existing != null) {
            existing.setQuantity(desired);
        } else {
            CartItem item = new CartItem();
            item.setCart(cart);
            item.setProduct(product);
            item.setQuantity(desired);
            cart.getItems().add(item);
        }
        cart.setUpdatedAt(Instant.now());
        cartRepository.save(cart);
        return toResponse(reload(user));
    }

    @Transactional
    public CartDtos.CartResponse updateItem(User user, Long itemId, CartDtos.UpdateItemRequest request) {
        Cart cart = getOrCreateCart(user);
        CartItem item = cartItemRepository.findByIdAndCart(itemId, cart)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CART_ITEM_NOT_FOUND", "Cart item not found"));
        ensureStock(item.getProduct(), request.quantity());
        item.setQuantity(request.quantity());
        cart.setUpdatedAt(Instant.now());
        cartRepository.save(cart);
        return toResponse(reload(user));
    }

    @Transactional
    public CartDtos.CartResponse removeItem(User user, Long itemId) {
        Cart cart = getOrCreateCart(user);
        CartItem item = cartItemRepository.findByIdAndCart(itemId, cart)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CART_ITEM_NOT_FOUND", "Cart item not found"));
        cart.getItems().remove(item);
        cartItemRepository.delete(item);
        cart.setUpdatedAt(Instant.now());
        cartRepository.save(cart);
        return toResponse(reload(user));
    }

    @Transactional
    public CartDtos.CartResponse applyPromo(User user, CartDtos.ApplyPromoRequest request) {
        Cart cart = getOrCreateCart(user);
        int subtotal = subtotalCents(cart);
        String code = promoService.normalize(request.code());
        promoService.discountFor(code, subtotal);
        cart.setPromoCode(code);
        cart.setUpdatedAt(Instant.now());
        cartRepository.save(cart);
        return toResponse(reload(user));
    }

    @Transactional
    public CartDtos.CartResponse clearPromo(User user) {
        Cart cart = getOrCreateCart(user);
        cart.setPromoCode(null);
        cart.setUpdatedAt(Instant.now());
        cartRepository.save(cart);
        return toResponse(reload(user));
    }

    @Transactional
    public Cart getOrCreateCart(User user) {
        return cartRepository.findByUserWithItems(user).orElseGet(() -> {
            Cart cart = new Cart();
            cart.setUser(user);
            return cartRepository.save(cart);
        });
    }

    @Transactional
    public void clearCart(Cart cart) {
        cart.getItems().clear();
        cart.setPromoCode(null);
        cart.setUpdatedAt(Instant.now());
        cartRepository.save(cart);
    }

    public void ensureStock(Product product, int quantity) {
        if (product.getStockQuantity() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OUT_OF_STOCK", "Product is out of stock");
        }
        if (quantity > product.getStockQuantity()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INSUFFICIENT_STOCK",
                    "Only " + product.getStockQuantity() + " left in stock");
        }
    }

    private Cart reload(User user) {
        return cartRepository.findByUserWithItems(user)
                .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "CART_MISSING", "Cart missing"));
    }

    private int subtotalCents(Cart cart) {
        return cart.getItems().stream()
                .mapToInt(item -> item.getProduct().getPriceCents() * item.getQuantity())
                .sum();
    }

    private CartDtos.CartResponse toResponse(Cart cart) {
        List<CartDtos.CartItemResponse> items = cart.getItems().stream()
                .sorted(Comparator.comparing(CartItem::getId))
                .map(item -> {
                    Product product = item.getProduct();
                    int lineTotal = product.getPriceCents() * item.getQuantity();
                    return new CartDtos.CartItemResponse(
                            item.getId(),
                            product.getId(),
                            product.getName(),
                            product.getImagePath(),
                            product.getPriceCents(),
                            item.getQuantity(),
                            lineTotal
                    );
                })
                .toList();
        int itemCount = items.stream().mapToInt(CartDtos.CartItemResponse::quantity).sum();
        int subtotal = items.stream().mapToInt(CartDtos.CartItemResponse::lineTotalCents).sum();
        int discount = promoService.softDiscountFor(cart.getPromoCode(), subtotal);
        int total = Math.max(0, subtotal - discount);
        return new CartDtos.CartResponse(
                cart.getId(),
                items,
                itemCount,
                subtotal,
                discount,
                total,
                cart.getPromoCode()
        );
    }
}
