package com.sample.ecommerce.cart;

import com.sample.ecommerce.auth.User;
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

import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;
    @Mock
    private CartItemRepository cartItemRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private PromoService promoService;

    @InjectMocks
    private CartService cartService;

    private User user;
    private Cart cart;
    private Product product;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setUsername("demo");

        cart = new Cart();
        cart.setId(10L);
        cart.setUser(user);
        cart.setItems(new ArrayList<>());

        product = new Product();
        product.setId(100L);
        product.setName("Widget");
        product.setImagePath("/img/widget.png");
        product.setPriceCents(500);
        product.setStockQuantity(50);
    }

    @Test
    void ensureStockZeroStockThrowsOutOfStock() {
        product.setStockQuantity(0);
        assertThatThrownBy(() -> cartService.ensureStock(product, 1))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(api.getCode()).isEqualTo("OUT_OF_STOCK");
                });
    }

    @Test
    void ensureStockQuantityAboveStockThrowsInsufficientStock() {
        product.setStockQuantity(2);
        assertThatThrownBy(() -> cartService.ensureStock(product, 3))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("INSUFFICIENT_STOCK"));
    }

    @Test
    void addItemUnknownProductThrowsProductNotFound() {
        when(cartRepository.findByUserWithItems(user)).thenReturn(Optional.of(cart));
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.addItem(user, new CartDtos.AddItemRequest(999L, 1)))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(api.getCode()).isEqualTo("PRODUCT_NOT_FOUND");
                });
    }

    @Test
    void addItemCreatesNewLineAndSaves() {
        when(cartRepository.findByUserWithItems(user)).thenReturn(Optional.of(cart));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(promoService.softDiscountFor(null, 1000)).thenReturn(0);

        CartDtos.CartResponse response = cartService.addItem(user, new CartDtos.AddItemRequest(100L, 2));

        assertThat(cart.getItems()).hasSize(1);
        assertThat(cart.getItems().getFirst().getQuantity()).isEqualTo(2);
        assertThat(cart.getItems().getFirst().getProduct()).isEqualTo(product);
        verify(cartRepository).save(cart);
        assertThat(response.itemCount()).isEqualTo(2);
        assertThat(response.subtotalCents()).isEqualTo(1000);
    }

    @Test
    void addItemExistingLineSumsQuantityAndCapsAt99() {
        product.setStockQuantity(200);
        CartItem existing = new CartItem();
        existing.setId(1L);
        existing.setCart(cart);
        existing.setProduct(product);
        existing.setQuantity(95);
        cart.getItems().add(existing);

        when(cartRepository.findByUserWithItems(user)).thenReturn(Optional.of(cart));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(promoService.softDiscountFor(null, 99 * 500)).thenReturn(0);

        CartDtos.CartResponse response = cartService.addItem(user, new CartDtos.AddItemRequest(100L, 10));

        assertThat(cart.getItems()).hasSize(1);
        assertThat(existing.getQuantity()).isEqualTo(99);
        assertThat(response.itemCount()).isEqualTo(99);
        verify(cartRepository).save(cart);
    }

    @Test
    void updateItemMissingLineThrowsCartItemNotFound() {
        when(cartRepository.findByUserWithItems(user)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByIdAndCart(99L, cart)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.updateItem(user, 99L, new CartDtos.UpdateItemRequest(2)))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(api.getCode()).isEqualTo("CART_ITEM_NOT_FOUND");
                });
    }

    @Test
    void removeItemMissingLineThrowsCartItemNotFound() {
        when(cartRepository.findByUserWithItems(user)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByIdAndCart(99L, cart)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.removeItem(user, 99L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("CART_ITEM_NOT_FOUND"));
    }

    @Test
    void applyPromoStoresNormalizedCodeAfterDiscountSucceeds() {
        CartItem item = new CartItem();
        item.setId(1L);
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(2);
        cart.getItems().add(item);

        when(cartRepository.findByUserWithItems(user)).thenReturn(Optional.of(cart));
        when(promoService.normalize(" save10 ")).thenReturn("SAVE10");
        when(promoService.discountFor("SAVE10", 1000)).thenReturn(100);
        when(promoService.softDiscountFor("SAVE10", 1000)).thenReturn(100);

        CartDtos.CartResponse response = cartService.applyPromo(user, new CartDtos.ApplyPromoRequest(" save10 "));

        assertThat(cart.getPromoCode()).isEqualTo("SAVE10");
        assertThat(response.promoCode()).isEqualTo("SAVE10");
        assertThat(response.discountCents()).isEqualTo(100);
        verify(cartRepository).save(cart);
    }

    @Test
    void applyPromoDoesNotStoreCodeWhenDiscountFails() {
        when(cartRepository.findByUserWithItems(user)).thenReturn(Optional.of(cart));
        when(promoService.normalize("BAD")).thenReturn("BAD");
        when(promoService.discountFor("BAD", 0))
                .thenThrow(new ApiException(HttpStatus.BAD_REQUEST, "PROMO_INVALID", "Promo code is not valid"));

        assertThatThrownBy(() -> cartService.applyPromo(user, new CartDtos.ApplyPromoRequest("BAD")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("PROMO_INVALID"));

        assertThat(cart.getPromoCode()).isNull();
        verify(cartRepository, never()).save(any());
    }

    @Test
    void updateItemUpdatesQuantity() {
        CartItem item = new CartItem();
        item.setId(1L);
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(1);
        cart.getItems().add(item);

        when(cartRepository.findByUserWithItems(user)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByIdAndCart(1L, cart)).thenReturn(Optional.of(item));
        when(promoService.softDiscountFor(null, 1500)).thenReturn(0);

        CartDtos.CartResponse response = cartService.updateItem(user, 1L, new CartDtos.UpdateItemRequest(3));

        assertThat(item.getQuantity()).isEqualTo(3);
        assertThat(response.itemCount()).isEqualTo(3);
        verify(cartRepository).save(cart);
    }

    @Test
    void removeItemDeletesLine() {
        CartItem item = new CartItem();
        item.setId(1L);
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(1);
        cart.getItems().add(item);

        when(cartRepository.findByUserWithItems(user)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByIdAndCart(1L, cart)).thenReturn(Optional.of(item));
        when(promoService.softDiscountFor(null, 0)).thenReturn(0);

        CartDtos.CartResponse response = cartService.removeItem(user, 1L);

        assertThat(cart.getItems()).isEmpty();
        assertThat(response.itemCount()).isZero();
        verify(cartItemRepository).delete(item);
        verify(cartRepository).save(cart);
    }

    @Test
    void getOrCreateCartCreatesWhenMissing() {
        when(cartRepository.findByUserWithItems(user)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> {
            Cart created = invocation.getArgument(0);
            created.setId(42L);
            return created;
        });

        Cart created = cartService.getOrCreateCart(user);

        assertThat(created.getId()).isEqualTo(42L);
        assertThat(created.getUser()).isEqualTo(user);
        ArgumentCaptor<Cart> captor = ArgumentCaptor.forClass(Cart.class);
        verify(cartRepository).save(captor.capture());
        assertThat(captor.getValue().getUser()).isEqualTo(user);
    }
}
