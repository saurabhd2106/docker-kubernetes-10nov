ALTER TABLE carts
    ADD COLUMN promo_code VARCHAR(20);

ALTER TABLE orders
    ADD COLUMN subtotal_cents INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN discount_cents INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN promo_code VARCHAR(20);

UPDATE orders SET subtotal_cents = total_cents WHERE subtotal_cents = 0;

CREATE TABLE promo_codes (
    code                VARCHAR(20) PRIMARY KEY,
    discount_type       VARCHAR(20) NOT NULL,
    percent_off         INTEGER,
    amount_cents        INTEGER,
    min_subtotal_cents  INTEGER NOT NULL DEFAULT 0,
    active              BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO promo_codes (code, discount_type, percent_off, amount_cents, min_subtotal_cents, active) VALUES
    ('SAVE10', 'PERCENT', 10, NULL, 0, TRUE),
    ('FIVEOFF', 'FIXED', NULL, 500, 2000, TRUE),
    ('EXPIRED', 'FIXED', NULL, 100, 0, FALSE);
