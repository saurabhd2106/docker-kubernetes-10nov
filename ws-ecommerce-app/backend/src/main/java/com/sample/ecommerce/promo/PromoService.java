package com.sample.ecommerce.promo;

import com.sample.ecommerce.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class PromoService {

    private final PromoCodeRepository promoCodeRepository;

    public PromoService(PromoCodeRepository promoCodeRepository) {
        this.promoCodeRepository = promoCodeRepository;
    }

    @Transactional(readOnly = true)
    public PromoCode requireUsable(String rawCode) {
        String code = normalize(rawCode);
        PromoCode promo = promoCodeRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "PROMO_INVALID", "Promo code is not valid"));
        if (!promo.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PROMO_EXPIRED", "Promo code has expired");
        }
        return promo;
    }

    @Transactional(readOnly = true)
    public int discountFor(String rawCode, int subtotalCents) {
        if (rawCode == null || rawCode.isBlank()) {
            return 0;
        }
        PromoCode promo = requireUsable(rawCode);
        if (subtotalCents < promo.getMinSubtotalCents()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "PROMO_MIN_NOT_MET",
                    "Cart subtotal does not meet the minimum for this promo");
        }
        return calculateDiscount(promo, subtotalCents);
    }

    @Transactional(readOnly = true)
    public int softDiscountFor(String rawCode, int subtotalCents) {
        if (rawCode == null || rawCode.isBlank()) {
            return 0;
        }
        try {
            return discountFor(rawCode, subtotalCents);
        } catch (ApiException ex) {
            return 0;
        }
    }

    public int calculateDiscount(PromoCode promo, int subtotalCents) {
        if ("PERCENT".equalsIgnoreCase(promo.getDiscountType())) {
            int percent = promo.getPercentOff() == null ? 0 : promo.getPercentOff();
            return BigDecimal.valueOf(subtotalCents)
                    .multiply(BigDecimal.valueOf(percent))
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                    .intValue();
        }
        if ("FIXED".equalsIgnoreCase(promo.getDiscountType())) {
            int amount = promo.getAmountCents() == null ? 0 : promo.getAmountCents();
            return Math.min(amount, subtotalCents);
        }
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "PROMO_CONFIG", "Unknown promo type");
    }

    public String normalize(String rawCode) {
        return rawCode == null ? "" : rawCode.trim().toUpperCase();
    }
}
