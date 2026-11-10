package com.sample.ecommerce.order;

import com.sample.ecommerce.auth.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class ShopOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "subtotal_cents", nullable = false)
    private int subtotalCents;

    @Column(name = "discount_cents", nullable = false)
    private int discountCents;

    @Column(name = "total_cents", nullable = false)
    private int totalCents;

    @Column(name = "promo_code", length = 20)
    private String promoCode;

    @Column(name = "card_last4", nullable = false, length = 4)
    private String cardLast4;

    @Column(name = "shipping_name", nullable = false, length = 100)
    private String shippingName;

    @Column(name = "shipping_line1", nullable = false, length = 200)
    private String shippingLine1;

    @Column(name = "shipping_city", nullable = false, length = 100)
    private String shippingCity;

    @Column(name = "shipping_region", nullable = false, length = 50)
    private String shippingRegion;

    @Column(name = "shipping_postal", nullable = false, length = 20)
    private String shippingPostal;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getSubtotalCents() {
        return subtotalCents;
    }

    public void setSubtotalCents(int subtotalCents) {
        this.subtotalCents = subtotalCents;
    }

    public int getDiscountCents() {
        return discountCents;
    }

    public void setDiscountCents(int discountCents) {
        this.discountCents = discountCents;
    }

    public int getTotalCents() {
        return totalCents;
    }

    public void setTotalCents(int totalCents) {
        this.totalCents = totalCents;
    }

    public String getPromoCode() {
        return promoCode;
    }

    public void setPromoCode(String promoCode) {
        this.promoCode = promoCode;
    }

    public String getCardLast4() {
        return cardLast4;
    }

    public void setCardLast4(String cardLast4) {
        this.cardLast4 = cardLast4;
    }

    public String getShippingName() {
        return shippingName;
    }

    public void setShippingName(String shippingName) {
        this.shippingName = shippingName;
    }

    public String getShippingLine1() {
        return shippingLine1;
    }

    public void setShippingLine1(String shippingLine1) {
        this.shippingLine1 = shippingLine1;
    }

    public String getShippingCity() {
        return shippingCity;
    }

    public void setShippingCity(String shippingCity) {
        this.shippingCity = shippingCity;
    }

    public String getShippingRegion() {
        return shippingRegion;
    }

    public void setShippingRegion(String shippingRegion) {
        this.shippingRegion = shippingRegion;
    }

    public String getShippingPostal() {
        return shippingPostal;
    }

    public void setShippingPostal(String shippingPostal) {
        this.shippingPostal = shippingPostal;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public void setItems(List<OrderItem> items) {
        this.items = items;
    }
}
