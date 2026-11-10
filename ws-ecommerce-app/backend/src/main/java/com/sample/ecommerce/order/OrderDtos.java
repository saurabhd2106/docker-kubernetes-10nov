package com.sample.ecommerce.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class OrderDtos {

    private OrderDtos() {
    }

    public record CheckoutRequest(
            @NotBlank @Size(max = 100) String shippingName,
            @NotBlank @Size(max = 200) String shippingLine1,
            @NotBlank @Size(max = 100) String shippingCity,
            @NotBlank @Size(max = 50) String shippingRegion,
            @NotBlank @Size(max = 20) String shippingPostal,
            @NotBlank @Size(max = 100) String cardName,
            @NotBlank @Pattern(regexp = "\\d{13,19}", message = "Card number must be 13-19 digits") String cardNumber,
            @NotBlank @Pattern(regexp = "(0[1-9]|1[0-2])/\\d{2}", message = "Expiry must be MM/YY") String cardExpiry,
            @NotBlank @Pattern(regexp = "\\d{3,4}", message = "CVV must be 3 or 4 digits") String cardCvv
    ) {
    }

    public record OrderItemResponse(
            Long id,
            String productName,
            int unitPriceCents,
            int quantity,
            int lineTotalCents
    ) {
    }

    public record OrderResponse(
            Long id,
            String status,
            int subtotalCents,
            int discountCents,
            int totalCents,
            String promoCode,
            String cardLast4,
            String shippingName,
            String shippingLine1,
            String shippingCity,
            String shippingRegion,
            String shippingPostal,
            Instant createdAt,
            List<OrderItemResponse> items
    ) {
    }
}
