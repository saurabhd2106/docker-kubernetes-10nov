package com.sample.ecommerce.promo;

import com.sample.ecommerce.common.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromoServiceTest {

    @Mock
    private PromoCodeRepository promoCodeRepository;

    @InjectMocks
    private PromoService promoService;

    @Test
    void normalizeTrimsAndUppercases() {
        assertThat(promoService.normalize("  save10  ")).isEqualTo("SAVE10");
    }

    @Test
    void normalizeNullReturnsEmpty() {
        assertThat(promoService.normalize(null)).isEqualTo("");
    }

    @Test
    void calculatePercentDiscountUsesHalfUpRounding() {
        PromoCode promo = percentPromo("SAVE10", 10, 0);
        assertThat(promoService.calculateDiscount(promo, 199)).isEqualTo(20);
    }

    @Test
    void calculateFixedDiscountIsCappedAtSubtotal() {
        PromoCode promo = fixedPromo("FLAT5", 500, 0);
        assertThat(promoService.calculateDiscount(promo, 300)).isEqualTo(300);
    }

    @Test
    void calculateUnknownTypeThrowsPromoConfig() {
        PromoCode promo = new PromoCode();
        promo.setCode("BAD");
        promo.setDiscountType("BOGO");
        promo.setActive(true);
        promo.setMinSubtotalCents(0);

        assertThatThrownBy(() -> promoService.calculateDiscount(promo, 1000))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
                    assertThat(api.getCode()).isEqualTo("PROMO_CONFIG");
                });
    }

    @Test
    void discountForMissingCodeThrowsPromoInvalid() {
        when(promoCodeRepository.findByCodeIgnoreCase("MISSING")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> promoService.discountFor("missing", 1000))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(api.getCode()).isEqualTo("PROMO_INVALID");
                });
    }

    @Test
    void discountForInactiveCodeThrowsPromoExpired() {
        PromoCode promo = percentPromo("OLD", 10, 0);
        promo.setActive(false);
        when(promoCodeRepository.findByCodeIgnoreCase("OLD")).thenReturn(Optional.of(promo));

        assertThatThrownBy(() -> promoService.discountFor("OLD", 1000))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("PROMO_EXPIRED"));
    }

    @Test
    void discountForSubtotalBelowMinimumThrowsPromoMinNotMet() {
        PromoCode promo = percentPromo("SAVE10", 10, 2000);
        when(promoCodeRepository.findByCodeIgnoreCase("SAVE10")).thenReturn(Optional.of(promo));

        assertThatThrownBy(() -> promoService.discountFor("SAVE10", 1000))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("PROMO_MIN_NOT_MET"));
    }

    @Test
    void discountForBlankCodeReturnsZero() {
        assertThat(promoService.discountFor("  ", 1000)).isZero();
        assertThat(promoService.discountFor(null, 1000)).isZero();
    }

    @Test
    void softDiscountForReturnsZeroOnApiException() {
        when(promoCodeRepository.findByCodeIgnoreCase("MISSING")).thenReturn(Optional.empty());
        assertThat(promoService.softDiscountFor("missing", 1000)).isZero();
    }

    @Test
    void discountForValidPercentCodeAppliesDiscount() {
        PromoCode promo = percentPromo("SAVE10", 10, 0);
        when(promoCodeRepository.findByCodeIgnoreCase("SAVE10")).thenReturn(Optional.of(promo));
        assertThat(promoService.discountFor("save10", 1000)).isEqualTo(100);
    }

    private static PromoCode percentPromo(String code, int percentOff, int minSubtotal) {
        PromoCode promo = new PromoCode();
        promo.setCode(code);
        promo.setDiscountType("PERCENT");
        promo.setPercentOff(percentOff);
        promo.setMinSubtotalCents(minSubtotal);
        promo.setActive(true);
        return promo;
    }

    private static PromoCode fixedPromo(String code, int amountCents, int minSubtotal) {
        PromoCode promo = new PromoCode();
        promo.setCode(code);
        promo.setDiscountType("FIXED");
        promo.setAmountCents(amountCents);
        promo.setMinSubtotalCents(minSubtotal);
        promo.setActive(true);
        return promo;
    }
}
