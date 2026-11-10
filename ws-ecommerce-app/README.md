# Oakline — sample 3-tier ecommerce app

Oakline React storefront, Spring Boot REST API, and PostgreSQL. Built to demonstrate shopper journeys that a Playwright suite can later automate, including happy-path checkout and QA edge cases (sort/filter, stock, promos, cancel).

## Prerequisites

- Docker and Docker Compose
- Java 21+
- Maven 3.9+
- Node.js 20+

## Start the stack

```bash
# 1. Database
docker compose up -d

# 2. Backend (port 8080)
cd backend
mvn spring-boot:run

# 3. Frontend (port 5173)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Demo account

- Username: `demo`
- Password: `password1`

## Dummy cards

Approved: `4242424242424242`, `5555555555554444`, `378282246310005`

Declined: `4000000000000002`, `4000000000009995`

## Promo codes

| Code | Behavior |
|------|----------|
| `SAVE10` | 10% off (half-up to the cent) |
| `FIVEOFF` | $5.00 off when subtotal is at least $20.00 |
| `EXPIRED` | Always rejected |

## Demo reset

Clears carts and orders, restores catalog stock from seed data, and keeps the `demo` user:

```bash
curl -X POST http://localhost:8080/api/demo/reset
```

Controlled by `app.demo-reset-enabled` (default `true`).

## Pinned QA cases

### Happy-path checkout ($69.97)

1. Search `AeroClick`, open AeroClick Wireless Mouse ($24.99), add quantity 2 (login as `demo` / `password1` if needed).
2. Search `Northline`, add one Northline Cotton Tee ($19.99). Cart count 3, subtotal **$69.97**.
3. Pay with `4000000000000002` → declined, cart unchanged.
4. Pay with `4242424242424242` → paid order total $69.97, cart empty.

### Sort and price filter

1. Set max price to `10` and sort to **Price: low to high**.
2. First card is **GardenPasta Penne** at **$3.49**.
3. Set max price to `0.01` → empty results.

### Stock limits

1. Search `SoldOut` → Add to cart disabled, shows out of stock.
2. Search `LastPair`, try quantity 2 → error, cart unchanged.
3. Add quantity 1, checkout with approved card → stock becomes 0.

### Promo codes

1. Cart with only Northline Cotton Tee ($19.99) → `FIVEOFF` rejected.
2. Add one AeroClick Wireless Mouse → subtotal **$44.98**.
3. Apply `SAVE10` → discount **$4.50**, total **$40.48**.
4. `EXPIRED` rejected; declined card leaves promo on the cart.

### Cancel order

1. Buy the one LastPair USB Hub.
2. On the order page, cancel → status **Cancelled**, stock returns to 1.
3. Cancel again → conflict error.

## Product images

Images live under `frontend/public/images/products`. To regenerate them:

```bash
node scripts/download-product-images.mjs
```
