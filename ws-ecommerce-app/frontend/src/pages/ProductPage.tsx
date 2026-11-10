import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, api, formatMoney } from '../api'
import { useAuth } from '../AuthContext'
import { ProductCard } from '../components/ProductCard'
import { demoComparePrice, demoRating, isWishlisted, toggleWishlist } from '../lib/wishlist'
import type { Product } from '../types'

const SWATCHES = [
  { id: 'black', label: 'Midnight Black', color: '#1a1a1a' },
  { id: 'white', label: 'Cloud White', color: '#f4f4f4' },
  { id: 'gray', label: 'Slate Gray', color: '#8a8a8a' },
  { id: 'sand', label: 'Sand', color: '#d6c3a5' },
]

const SPECS: Record<string, Array<[string, string]>> = {
  electronics: [
    ['Connectivity', 'Bluetooth 5.3 / USB-C'],
    ['Battery life', 'Up to 8 hours'],
    ['Total play time', 'Up to 24 hours with case'],
    ['Charging', 'USB-C'],
    ['Water resistance', 'IPX4'],
    ['In the box', 'Product, cable, quick start guide'],
  ],
  default: [
    ['Material', 'Premium everyday materials'],
    ['Care', 'See product label'],
    ['Origin', 'Assembled for Oakline demos'],
    ['Warranty', '1-year limited warranty'],
  ],
}

const REVIEWS = [
  {
    name: 'Maya R.',
    title: 'Exactly what I needed',
    body: 'Clean design, easy setup, and it feels sturdy. Shipping was quick for a demo order.',
    stars: 5,
    date: 'Oct 12, 2026',
  },
  {
    name: 'Daniel P.',
    title: 'Solid everyday pick',
    body: 'Great value for the price. Would buy again for gifts. The storefront checkout flow was smooth.',
    stars: 4,
    date: 'Sep 28, 2026',
  },
]

export function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, setCart } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [quantity, setQuantity] = useState(1)
  const [thumb, setThumb] = useState(0)
  const [swatch, setSwatch] = useState(SWATCHES[0])
  const [tab, setTab] = useState<'description' | 'specs' | 'shipping' | 'reviews'>('description')
  const [wished, setWished] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const productId = Number(id)
    if (!productId) {
      setError('Product not found')
      setLoading(false)
      return
    }
    setLoading(true)
    api.getProduct(productId)
      .then((p) => {
        setProduct(p)
        setWished(isWishlisted(p.id))
        return api.getProducts({ category: p.categorySlug, size: 8 })
      })
      .then((page) => {
        setRelated(page.items.filter((p) => p.id !== productId).slice(0, 4))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function ensureAuth(from: string) {
    if (!user) {
      navigate('/login', { state: { from } })
      return false
    }
    return true
  }

  async function addToCart() {
    setError('')
    setMessage('')
    if (!(await ensureAuth(`/products/${id}`))) return null
    try {
      const cart = await api.addToCart(product!.id, quantity)
      setCart(cart)
      setMessage('Added to cart')
      return cart
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add to cart')
      return null
    }
  }

  async function onBuyNow() {
    const cart = await addToCart()
    if (cart) navigate('/checkout')
  }

  if (loading) return <div className="page"><p>Loading…</p></div>
  if (error && !product) return <div className="page"><p className="error">{error}</p></div>
  if (!product) return null

  const soldOut = product.stockQuantity <= 0
  const rating = demoRating(product.id)
  const compare = demoComparePrice(product.priceCents, product.id)
  const specs = SPECS[product.categorySlug] ?? SPECS.default
  const thumbs = [0, 1, 2, 3]

  return (
    <div className="page product-detail">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={`/?category=${product.categorySlug}`}>{product.categoryName}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>

      <div className="detail-layout">
        <div>
          <div className="gallery-main">
            {compare && <span className="sale-ribbon">Save 20%</span>}
            <img src={product.imagePath} alt={`${product.name} view ${thumb + 1}`} />
          </div>
          <div className="thumb-row">
            {thumbs.map((t) => (
              <button
                key={t}
                type="button"
                className={thumb === t ? 'active' : ''}
                onClick={() => setThumb(t)}
              >
                <img src={product.imagePath} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="detail-info">
          <p className="eyebrow">{product.categoryName}</p>
          <h1 data-testid="product-name">{product.name}</h1>
          <div className="detail-meta">
            <span className="stars">
              {'★'.repeat(Math.round(rating.score))}{'☆'.repeat(5 - Math.round(rating.score))}
              <span>{rating.score} · {rating.reviews} reviews</span>
            </span>
            <span className="muted">SKU: {product.sku}</span>
          </div>
          <div className="price-row">
            <span className="price large">{formatMoney(product.priceCents)}</span>
            {compare && (
              <>
                <span className="compare-price">{formatMoney(compare)}</span>
                <span className="save-label">You save {formatMoney(compare - product.priceCents)}</span>
              </>
            )}
          </div>
          <p>{product.description}</p>

          <p><strong>Colour:</strong> {swatch.label}</p>
          <div className="swatches">
            {SWATCHES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`swatch${swatch.id === s.id ? ' active' : ''}`}
                style={{ background: s.color }}
                aria-label={s.label}
                onClick={() => setSwatch(s)}
              />
            ))}
          </div>

          <p data-testid="product-stock" className={soldOut ? 'error' : 'success'}>
            {soldOut
              ? 'Out of stock'
              : `In stock — ${product.stockQuantity} available. Ships within 24 hours`}
          </p>

          <div className="buy-row">
            <div className="qty-stepper">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={soldOut}>−</button>
              <input
                data-testid="quantity-input"
                type="number"
                min={1}
                max={99}
                value={quantity}
                disabled={soldOut}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} disabled={soldOut}>+</button>
            </div>
            <button data-testid="add-to-cart" type="button" disabled={soldOut} onClick={() => void addToCart()}>
              {soldOut ? 'Sold out' : 'Add to cart'}
            </button>
            <button type="button" className="btn-outline" disabled={soldOut} onClick={() => void onBuyNow()}>
              Buy now
            </button>
            <button
              type="button"
              className={`wish-toggle${wished ? ' on' : ''}`}
              style={{ position: 'static' }}
              onClick={() => setWished(toggleWishlist(product.id))}
              aria-label="Wishlist"
            >
              {wished ? '♥' : '♡'}
            </button>
          </div>
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}

          <ul className="usp-list">
            <li>✓ Free delivery on orders over $50</li>
            <li>✓ Free 30-day returns</li>
            <li>✓ 1-year limited warranty</li>
          </ul>
        </div>
      </div>

      <div className="tabs">
        {([
          ['description', 'Description'],
          ['specs', 'Specifications'],
          ['shipping', 'Shipping & Returns'],
          ['reviews', `Reviews (${rating.reviews})`],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'description' && (
        <div className="tab-panels">
          <div>
            <h2>Made for the commute, the gym and everything between</h2>
            <p>{product.description}</p>
            <ul>
              <li>Clean, balanced everyday performance</li>
              <li>Thoughtful details for daily use</li>
              <li>Designed to pair with the rest of your Oakline kit</li>
              <li>Backed by a simple demo warranty story</li>
            </ul>
          </div>
          <table className="spec-table">
            <tbody>
              {specs.slice(0, 4).map(([k, v]) => (
                <tr key={k}><th>{k}</th><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'specs' && (
        <table className="spec-table">
          <tbody>
            {specs.map(([k, v]) => (
              <tr key={k}><th>{k}</th><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'shipping' && (
        <div>
          <p>Orders over $50 ship free in this demo. Standard delivery estimates show as 2–5 business days.</p>
          <p>Returns are free within 30 days for unused items in original packaging.</p>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="reviews-layout">
          <div className="review-summary">
            <div className="big">{rating.score}</div>
            <p className="stars">{'★'.repeat(Math.round(rating.score))}</p>
            <p className="muted">{rating.reviews} reviews</p>
            <button type="button" className="btn-outline" style={{ marginTop: '0.75rem' }}>Write a review</button>
          </div>
          <div>
            {REVIEWS.map((r) => (
              <article key={r.name} className="review-card">
                <strong>{r.title}</strong>
                <p className="stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</p>
                <p className="muted">{r.name} · {r.date}</p>
                <p>{r.body}</p>
              </article>
            ))}
            <p className="muted">See all {rating.reviews} reviews (demo)</p>
          </div>
        </div>
      )}

      {related.length > 0 && (
        <section style={{ marginTop: '2.5rem' }}>
          <div className="section-head">
            <h2>You may also like</h2>
          </div>
          <div className="related-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
