package com.sample.ecommerce.cart;

import com.sample.ecommerce.auth.User;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public CartDtos.CartResponse getCart(@AuthenticationPrincipal User user) {
        return cartService.getCart(user);
    }

    @PostMapping("/items")
    public CartDtos.CartResponse addItem(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CartDtos.AddItemRequest request) {
        return cartService.addItem(user, request);
    }

    @PatchMapping("/items/{itemId}")
    public CartDtos.CartResponse updateItem(
            @AuthenticationPrincipal User user,
            @PathVariable Long itemId,
            @Valid @RequestBody CartDtos.UpdateItemRequest request) {
        return cartService.updateItem(user, itemId, request);
    }

    @DeleteMapping("/items/{itemId}")
    public CartDtos.CartResponse removeItem(
            @AuthenticationPrincipal User user,
            @PathVariable Long itemId) {
        return cartService.removeItem(user, itemId);
    }

    @PostMapping("/promo")
    public CartDtos.CartResponse applyPromo(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CartDtos.ApplyPromoRequest request) {
        return cartService.applyPromo(user, request);
    }

    @DeleteMapping("/promo")
    public CartDtos.CartResponse clearPromo(@AuthenticationPrincipal User user) {
        return cartService.clearPromo(user);
    }
}
