package com.sample.ecommerce.order;

import com.sample.ecommerce.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Set;

@Service
public class DummyPaymentService {

    private static final Set<String> APPROVED = Set.of(
            "4242424242424242",
            "5555555555554444",
            "378282246310005"
    );

    private static final Set<String> DECLINED = Set.of(
            "4000000000000002",
            "4000000000009995"
    );

    public String charge(String cardNumber, String cardExpiry, String cardCvv, String cardName) {
        String digits = cardNumber.replaceAll("\\s+", "");
        if (!digits.matches("\\d{13,19}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CARD", "Invalid card number");
        }
        if (cardName == null || cardName.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CARD", "Card name is required");
        }
        if (cardCvv == null || !cardCvv.matches("\\d{3,4}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CARD", "Invalid CVV");
        }
        YearMonth expiry;
        try {
            expiry = YearMonth.parse(cardExpiry, DateTimeFormatter.ofPattern("MM/yy"));
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CARD", "Invalid card expiry");
        }
        if (expiry.isBefore(YearMonth.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CARD", "Card is expired");
        }

        if (DECLINED.contains(digits)) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "PAYMENT_DECLINED", "Payment was declined");
        }
        if (!APPROVED.contains(digits)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CARD", "Unrecognized card number");
        }
        return digits.substring(digits.length() - 4);
    }
}
