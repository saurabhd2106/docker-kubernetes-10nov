import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, api, formatMoney } from '../api'
import { useAuth } from '../AuthContext'

export function CartPage() {
  const { cart, setCart } = useAuth()
  const [promoInput, setPromoInput] = useState('')
  const [promoError, setPromoError] = useState('')

  async function updateQuantity(itemId: number, quantity: number) {
    try {
      const next = await api.updateCartItem(itemId, quantity)
      setCart(next)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Update failed')
    }
  }

  async function removeItem(itemId: number) {
    try {
      const next = await api.removeCartItem(itemId)
      setCart(next)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Remove failed')
    }
  }

  async function applyPromo(e: FormEvent) {
    e.preventDefault()
    setPromoError('')
    try {
      const next = await api.applyPromo(promoInput)
      setCart(next)
      setPromoInput('')
    } catch (err) {
      setPromoError(err instanceof ApiError ? err.message : 'Could not apply promo')
    }
  }

  async function clearPromo() {
    setPromoError('')
    try {
      const next = await api.clearPromo()
      setCart(next)
    } catch (err) {
      setPromoError(err instanceof ApiError ? err.message : 'Could not clear promo')
    }
  }

  if (!cart) {
    return <div className="page"><p>Loading cart…</p></div>
  }

  if (cart.items.length === 0) {
    return (
      <div className="page">
        <h1>Your cart</h1>
        <p className="empty">Cart is empty.</p>
        <Link to="/">Continue shopping</Link>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Your cart</h1>
      <div className="cart-list">
        {cart.items.map((item) => (
          <div data-testid="cart-line" key={item.id} className="cart-line">
            <img src={item.imagePath} alt={item.productName} />
            <div className="cart-line-body">
              <h3>{item.productName}</h3>
              <p>{formatMoney(item.unitPriceCents)} each</p>
              <div className="cart-line-actions">
                <label>
                  Qty
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                  />
                </label>
                <button type="button" onClick={() => removeItem(item.id)}>Remove</button>
              </div>
            </div>
            <strong>{formatMoney(item.lineTotalCents)}</strong>
          </div>
        ))}
      </div>

      <form className="promo-form" onSubmit={applyPromo}>
        <label>
          Promo code
          <input
            data-testid="promo-input"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            placeholder="SAVE10"
          />
        </label>
        <button data-testid="promo-apply" type="submit">Apply</button>
        {cart.promoCode && (
          <button data-testid="promo-clear" type="button" className="linkish" onClick={clearPromo}>
            Remove {cart.promoCode}
          </button>
        )}
      </form>
      {promoError && <p data-testid="promo-error" className="error">{promoError}</p>}
      {cart.promoCode && cart.discountCents > 0 && (
        <p data-testid="promo-applied" className="success">
          Promo {cart.promoCode} applied
        </p>
      )}

      <div className="cart-summary">
        <div>
          <p data-testid="cart-subtotal">
            Subtotal: <strong>{formatMoney(cart.subtotalCents)}</strong>
          </p>
          <p data-testid="cart-discount">
            Discount: <strong>-{formatMoney(cart.discountCents)}</strong>
          </p>
          <p data-testid="cart-total">
            Total: <strong>{formatMoney(cart.totalCents)}</strong>
          </p>
        </div>
        <Link data-testid="checkout-button" to="/checkout" className="button-link">
          Checkout
        </Link>
      </div>
    </div>
  )
}
