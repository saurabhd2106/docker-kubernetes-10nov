import { useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api, formatMoney } from '../api'
import { useAuth } from '../AuthContext'
import { demoComparePrice, demoRating, isWishlisted, toggleWishlist } from '../lib/wishlist'
import type { Product } from '../types'

export function ProductCard({ product, forceSale }: { product: Product; forceSale?: boolean }) {
  const { user, setCart } = useAuth()
  const navigate = useNavigate()
  const [wished, setWished] = useState(() => isWishlisted(product.id))
  const [adding, setAdding] = useState(false)
  const rating = demoRating(product.id)
  const compare = forceSale || product.id % 5 === 0 ? demoComparePrice(product.priceCents, product.id) : null
  const isNew = product.id % 7 === 0
  const isBest = product.id % 11 === 0

  function onWish(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setWished(toggleWishlist(product.id))
  }

  async function onAdd(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login', { state: { from: `/products/${product.id}` } })
      return
    }
    setAdding(true)
    try {
      const cart = await api.addToCart(product.id, 1)
      setCart(cart)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Could not add to cart')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Link data-testid="product-card" to={`/products/${product.id}`} className="product-card">
      <div className="product-card-media">
        <img src={product.imagePath} alt={product.name} loading="lazy" />
        {compare && <span className="product-badge sale">Sale</span>}
        {!compare && isNew && <span className="product-badge new">New</span>}
        {!compare && !isNew && isBest && <span className="product-badge">Best seller</span>}
        <button
          type="button"
          className={`wish-toggle${wished ? ' on' : ''}`}
          aria-label="Wishlist"
          onClick={onWish}
        >
          {wished ? '♥' : '♡'}
        </button>
      </div>
      <div className="product-card-body">
        <h3 data-testid="product-name">{product.name}</h3>
        <p className="stars">
          {'★'.repeat(Math.round(rating.score))}{'☆'.repeat(5 - Math.round(rating.score))}
          <span>({rating.reviews})</span>
        </p>
        <div className="product-card-footer">
          <div>
            <p className="price">{formatMoney(product.priceCents)}</p>
            {compare && <span className="compare-price">{formatMoney(compare)}</span>}
          </div>
          <button type="button" className="add-mini" disabled={adding || product.stockQuantity <= 0} onClick={onAdd}>
            {product.stockQuantity <= 0 ? 'Sold out' : adding ? '…' : '+ Add'}
          </button>
        </div>
      </div>
    </Link>
  )
}
