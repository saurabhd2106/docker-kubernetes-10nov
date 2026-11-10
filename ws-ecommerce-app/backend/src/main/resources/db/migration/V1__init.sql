CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    password_hash   VARCHAR(100) NOT NULL,
    display_name    VARCHAR(100),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE products (
    id              BIGSERIAL PRIMARY KEY,
    category_id     BIGINT       NOT NULL REFERENCES categories(id),
    sku             VARCHAR(50)  NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT         NOT NULL,
    price_cents     INTEGER      NOT NULL CHECK (price_cents >= 0),
    image_path      VARCHAR(300) NOT NULL,
    stock_quantity  INTEGER      NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_lower ON products(LOWER(name));

CREATE TABLE carts (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL UNIQUE REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
    id              BIGSERIAL PRIMARY KEY,
    cart_id         BIGINT       NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id      BIGINT       NOT NULL REFERENCES products(id),
    quantity        INTEGER      NOT NULL CHECK (quantity > 0),
    UNIQUE (cart_id, product_id)
);

CREATE TABLE orders (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id),
    status              VARCHAR(20)  NOT NULL,
    total_cents         INTEGER      NOT NULL CHECK (total_cents >= 0),
    card_last4          VARCHAR(4)   NOT NULL,
    shipping_name       VARCHAR(100) NOT NULL,
    shipping_line1      VARCHAR(200) NOT NULL,
    shipping_city       VARCHAR(100) NOT NULL,
    shipping_region     VARCHAR(50)  NOT NULL,
    shipping_postal      VARCHAR(20)  NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);

CREATE TABLE order_items (
    id                  BIGSERIAL PRIMARY KEY,
    order_id            BIGINT       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id          BIGINT       REFERENCES products(id),
    product_name        VARCHAR(200) NOT NULL,
    unit_price_cents    INTEGER      NOT NULL CHECK (unit_price_cents >= 0),
    quantity            INTEGER      NOT NULL CHECK (quantity > 0)
);
