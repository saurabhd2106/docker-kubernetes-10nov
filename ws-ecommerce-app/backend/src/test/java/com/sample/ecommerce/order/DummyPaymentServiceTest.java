package com.sample.ecommerce.order;

import com.sample.ecommerce.common.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DummyPaymentServiceTest {

    private static final DateTimeFormatter EXPIRY = DateTimeFormatter.ofPattern("MM/yy");

    private DummyPaymentService paymentService;
    private String futureExpiry;
    private String pastExpiry;

    @BeforeEach
    void setUp() {
        paymentService = new DummyPaymentService();
        futureExpiry = YearMonth.now().plusMonths(6).format(EXPIRY);
        pastExpiry = YearMonth.now().minusMonths(1).format(EXPIRY);
    }

    @Test
    void chargeApprovedVisaReturnsLastFour() {
        String last4 = paymentService.charge("4242424242424242", futureExpiry, "123", "Ada Lovelace");
        assertThat(last4).isEqualTo("4242");
    }

    @Test
    void chargeStripsSpacesFromCardNumber() {
        String last4 = paymentService.charge("4242 4242 4242 4242", futureExpiry, "123", "Ada Lovelace");
        assertThat(last4).isEqualTo("4242");
    }

    @Test
    void chargeDeclinedCardThrowsPaymentDeclined() {
        assertThatThrownBy(() -> paymentService.charge("4000000000000002", futureExpiry, "123", "Ada Lovelace"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
                    assertThat(api.getCode()).isEqualTo("PAYMENT_DECLINED");
                });
    }

    @Test
    void chargeUnrecognizedCardThrowsInvalidCard() {
        assertThatThrownBy(() -> paymentService.charge("4111111111111111", futureExpiry, "123", "Ada Lovelace"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(api.getCode()).isEqualTo("INVALID_CARD");
                });
    }

    @Test
    void chargeTooShortNumberThrowsInvalidCard() {
        assertThatThrownBy(() -> paymentService.charge("424242424242", futureExpiry, "123", "Ada Lovelace"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("INVALID_CARD"));
    }

    @Test
    void chargeBlankNameThrowsInvalidCard() {
        assertThatThrownBy(() -> paymentService.charge("4242424242424242", futureExpiry, "123", "  "))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("INVALID_CARD"));
    }

    @Test
    void chargeBadCvvThrowsInvalidCard() {
        assertThatThrownBy(() -> paymentService.charge("4242424242424242", futureExpiry, "12", "Ada Lovelace"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("INVALID_CARD"));
    }

    @Test
    void chargeUnparseableExpiryThrowsInvalidCard() {
        assertThatThrownBy(() -> paymentService.charge("4242424242424242", "13/25", "123", "Ada Lovelace"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("INVALID_CARD"));
    }

    @Test
    void chargeExpiredCardThrowsInvalidCard() {
        assertThatThrownBy(() -> paymentService.charge("4242424242424242", pastExpiry, "123", "Ada Lovelace"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("INVALID_CARD"));
    }
}
