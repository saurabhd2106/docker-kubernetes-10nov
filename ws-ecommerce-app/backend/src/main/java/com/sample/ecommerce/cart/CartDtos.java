package com.sample.ecommerce.cart;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class CartDtos {

    private CartDtos() {
    }

    public record AddItemRequest(
            @NotNull Long productId,
            @NotNull @Min(1) @Max(99) Integer quantity
    ) {
    }

    public record UpdateItemRequest(
            @NotNull @Min(1) @Max(99) Integer quantity
    ) {
    }

    public record ApplyPromoRequest(
            @NotBlank @Size(max = 20) String code
    ) {
    }

    public record CartItemResponse(
            Long id,
            Long productId,
            String productName,
            String imagePath,
            int unitPriceCents,
            int quantity,
            int lineTotalCents
    ) {
    }

    public record CartResponse(
            Long id,
            List<CartItemResponse> items,
            int itemCount,
            int subtotalCents,
            int discountCents,
            int totalCents,
            String promoCode
    ) {
    }
}
