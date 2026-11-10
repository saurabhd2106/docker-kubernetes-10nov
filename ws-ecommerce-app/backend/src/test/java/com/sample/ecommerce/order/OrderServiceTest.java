package com.sample.ecommerce.order;

import com.sample.ecommerce.auth.User;
import com.sample.ecommerce.cart.Cart;
import com.sample.ecommerce.cart.CartItem;
import com.sample.ecommerce.cart.CartService;
import com.sample.ecommerce.catalog.Product;
import com.sample.ecommerce.catalog.ProductRepository;
import com.sample.ecommerce.common.ApiException;
import com.sample.ecommerce.promo.PromoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private CartService cartService;
    @Mock
    private DummyPaymentService paymentService;
    @Mock
    private PromoService promoService;
    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private OrderService orderService;

    private User user;
    private Cart cart;
    private Product product;
    private OrderDtos.CheckoutRequest checkoutRequest;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setUsername("demo");

        product = new Product();
        product.setId(100L);
        product.setName("Widget");
        product.setPriceCents(1000);
        product.setStockQuantity(10);

        cart = new Cart();
        cart.setId(10L);
        cart.setUser(user);
        cart.setItems(new ArrayList<>());

        String expiry = YearMonth.now().plusMonths(6).format(DateTimeFormatter.ofPattern("MM/yy"));
        checkoutRequest = new OrderDtos.CheckoutRequest(
                "Ada Lovelace",
                "1 Analytical Engine Way",
                "London",
                "LDN",
                "SW1A",
                "Ada Lovelace",
                "4242424242424242",
                expiry,
                "123"
        );
    }

    @Test
    void checkoutEmptyCartThrowsAndNeverCharges() {
        when(cartService.getOrCreateCart(user)).thenReturn(cart);

        assertThatThrownBy(() -> orderService.checkout(user, checkoutRequest))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(api.getCode()).isEqualTo("CART_EMPTY");
                });

        verify(paymentService, never()).charge(anyString(), anyString(), anyString(), anyString());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void checkoutDeclinedPaymentDoesNotDecrementStockOrSaveOrder() {
        addCartItem(2);
        when(cartService.getOrCreateCart(user)).thenReturn(cart);
        doNothing().when(cartService).ensureStock(eq(product), anyInt());
        when(paymentService.charge(anyString(), anyString(), anyString(), anyString()))
                .thenThrow(new ApiException(HttpStatus.PAYMENT_REQUIRED, "PAYMENT_DECLINED", "Payment was declined"));

        assertThatThrownBy(() -> orderService.checkout(user, checkoutRequest))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("PAYMENT_DECLINED"));

        assertThat(product.getStockQuantity()).isEqualTo(10);
        verify(productRepository, never()).save(any());
        verify(orderRepository, never()).save(any());
        verify(cartService, never()).clearCart(any());
    }

    @Test
    void checkoutSuccessSavesPaidOrderDecrementsStockAndClearsCart() {
        addCartItem(2);
        cart.setPromoCode("SAVE10");
        when(cartService.getOrCreateCart(user)).thenReturn(cart);
        doNothing().when(cartService).ensureStock(eq(product), anyInt());
        when(promoService.discountFor("SAVE10", 2000)).thenReturn(200);
        when(paymentService.charge(
                checkoutRequest.cardNumber(),
                checkoutRequest.cardExpiry(),
                checkoutRequest.cardCvv(),
                checkoutRequest.cardName()
        )).thenReturn("4242");
        when(orderRepository.save(any(ShopOrder.class))).thenAnswer(invocation -> {
            ShopOrder order = invocation.getArgument(0);
            order.setId(55L);
            int itemId = 1;
            for (OrderItem item : order.getItems()) {
                item.setId((long) itemId++);
            }
            return order;
        });
        when(productRepository.save(product)).thenReturn(product);
        doNothing().when(cartService).clearCart(cart);

        OrderDtos.OrderResponse response = orderService.checkout(user, checkoutRequest);

        assertThat(response.id()).isEqualTo(55L);
        assertThat(response.status()).isEqualTo("PAID");
        assertThat(response.subtotalCents()).isEqualTo(2000);
        assertThat(response.discountCents()).isEqualTo(200);
        assertThat(response.totalCents()).isEqualTo(1800);
        assertThat(response.promoCode()).isEqualTo("SAVE10");
        assertThat(response.cardLast4()).isEqualTo("4242");
        assertThat(product.getStockQuantity()).isEqualTo(8);
        verify(productRepository).save(product);
        verify(cartService).clearCart(cart);

        ArgumentCaptor<ShopOrder> captor = ArgumentCaptor.forClass(ShopOrder.class);
        verify(orderRepository).save(captor.capture());
        ShopOrder saved = captor.getValue();
        assertThat(saved.getItems()).hasSize(1);
        assertThat(saved.getItems().getFirst().getQuantity()).isEqualTo(2);
        assertThat(saved.getShippingName()).isEqualTo("Ada Lovelace");
    }

    @Test
    void cancelOrderMissingThrowsNotFound() {
        when(orderRepository.findByIdAndUserWithItems(99L, user)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.cancelOrder(user, 99L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(api.getCode()).isEqualTo("ORDER_NOT_FOUND");
                });
    }

    @Test
    void cancelOrderNonPaidThrowsNotCancellable() {
        ShopOrder order = paidOrder();
        order.setStatus("CANCELLED");
        when(orderRepository.findByIdAndUserWithItems(55L, user)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.cancelOrder(user, 55L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(api.getCode()).isEqualTo("ORDER_NOT_CANCELLABLE");
                });
    }

    @Test
    void cancelPaidOrderRestoresStockAndBecomesCancelled() {
        ShopOrder order = paidOrder();
        when(orderRepository.findByIdAndUserWithItems(55L, user)).thenReturn(Optional.of(order));
        when(productRepository.save(product)).thenReturn(product);
        when(orderRepository.save(order)).thenReturn(order);

        OrderDtos.OrderResponse response = orderService.cancelOrder(user, 55L);

        assertThat(response.status()).isEqualTo("CANCELLED");
        assertThat(product.getStockQuantity()).isEqualTo(12);
        verify(productRepository).save(product);
        verify(orderRepository).save(order);
    }

    private void addCartItem(int quantity) {
        CartItem item = new CartItem();
        item.setId(1L);
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(quantity);
        cart.getItems().add(item);
    }

    private ShopOrder paidOrder() {
        ShopOrder order = new ShopOrder();
        order.setId(55L);
        order.setUser(user);
        order.setStatus("PAID");
        order.setSubtotalCents(2000);
        order.setDiscountCents(0);
        order.setTotalCents(2000);
        order.setCardLast4("4242");
        order.setShippingName("Ada Lovelace");
        order.setShippingLine1("1 Analytical Engine Way");
        order.setShippingCity("London");
        order.setShippingRegion("LDN");
        order.setShippingPostal("SW1A");

        OrderItem item = new OrderItem();
        item.setId(1L);
        item.setOrder(order);
        item.setProduct(product);
        item.setProductName(product.getName());
        item.setUnitPriceCents(1000);
        item.setQuantity(2);
        order.getItems().add(item);
        return order;
    }
}
