package com.sample.ecommerce.promo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "promo_codes")
public class PromoCode {

    @Id
    @Column(length = 20)
    private String code;

    @Column(name = "discount_type", nullable = false, length = 20)
    private String discountType;

    @Column(name = "percent_off")
    private Integer percentOff;

    @Column(name = "amount_cents")
    private Integer amountCents;

    @Column(name = "min_subtotal_cents", nullable = false)
    private int minSubtotalCents;

    @Column(nullable = false)
    private boolean active;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDiscountType() {
        return discountType;
    }

    public void setDiscountType(String discountType) {
        this.discountType = discountType;
    }

    public Integer getPercentOff() {
        return percentOff;
    }

    public void setPercentOff(Integer percentOff) {
        this.percentOff = percentOff;
    }

    public Integer getAmountCents() {
        return amountCents;
    }

    public void setAmountCents(Integer amountCents) {
        this.amountCents = amountCents;
    }

    public int getMinSubtotalCents() {
        return minSubtotalCents;
    }

    public void setMinSubtotalCents(int minSubtotalCents) {
        this.minSubtotalCents = minSubtotalCents;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
