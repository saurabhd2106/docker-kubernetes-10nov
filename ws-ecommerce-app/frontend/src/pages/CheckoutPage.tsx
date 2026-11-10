import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, api, formatMoney } from '../api'
import { useAuth } from '../AuthContext'

export function CheckoutPage() {
  const { cart, setCart, refreshCart } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [shippingName, setShippingName] = useState('Demo User')
  const [shippingLine1, setShippingLine1] = useState('100 Market Street')
  const [shippingCity, setShippingCity] = useState('Austin')
  const [shippingRegion, setShippingRegion] = useState('TX')
  const [shippingPostal, setShippingPostal] = useState('78701')
  const [cardName, setCardName] = useState('Demo User')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('12/30')
  const [cardCvv, setCardCvv] = useState('123')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const order = await api.checkout({
        shippingName,
        shippingLine1,
        shippingCity,
        shippingRegion,
        shippingPostal,
        cardName,
        cardNumber: cardNumber.replace(/\s+/g, ''),
        cardExpiry,
        cardCvv,
      })
      await refreshCart()
      navigate(`/orders/${order.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (err.code === 'PAYMENT_DECLINED') {
          const latest = await api.getCart()
          setCart(latest)
        }
      } else {
        setError('Checkout failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!cart) return <div className="page"><p>Loading…</p></div>

  if (cart.items.length === 0) {
    return (
      <div className="page">
        <h1>Checkout</h1>
        <p className="empty">Your cart is empty.</p>
      </div>
    )
  }

  return (
    <div className="page narrow">
      <h1>Checkout</h1>
      <p data-testid="cart-subtotal">
        Subtotal: <strong>{formatMoney(cart.subtotalCents)}</strong>
      </p>
      <p data-testid="cart-discount">
        Discount{cart.promoCode ? ` (${cart.promoCode})` : ''}:{' '}
        <strong>-{formatMoney(cart.discountCents)}</strong>
      </p>
      <p data-testid="cart-total">
        Order total: <strong>{formatMoney(cart.totalCents)}</strong>
      </p>
      <ul className="checkout-items">
        {cart.items.map((item) => (
          <li data-testid="cart-line" key={item.id}>
            {item.productName} × {item.quantity} — {formatMoney(item.lineTotalCents)}
          </li>
        ))}
      </ul>

      <form className="stack-form" onSubmit={onSubmit}>
        <h2>Shipping</h2>
        <label>
          Full name
          <input data-testid="shipping-name" value={shippingName} onChange={(e) => setShippingName(e.target.value)} required />
        </label>
        <label>
          Address
          <input data-testid="shipping-line1" value={shippingLine1} onChange={(e) => setShippingLine1(e.target.value)} required />
        </label>
        <label>
          City
          <input data-testid="shipping-city" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} required />
        </label>
        <label>
          State / Region
          <input data-testid="shipping-region" value={shippingRegion} onChange={(e) => setShippingRegion(e.target.value)} required />
        </label>
        <label>
          Postal code
          <input data-testid="shipping-postal" value={shippingPostal} onChange={(e) => setShippingPostal(e.target.value)} required />
        </label>

        <h2>Payment</h2>
        <p className="muted">Dummy gateway. Approved: 4242424242424242. Declined: 4000000000000002.</p>
        <label>
          Name on card
          <input data-testid="card-name" value={cardName} onChange={(e) => setCardName(e.target.value)} required />
        </label>
        <label>
          Card number
          <input
            data-testid="card-number"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            inputMode="numeric"
            required
          />
        </label>
        <div className="row-2">
          <label>
            Expiry (MM/YY)
            <input data-testid="card-expiry" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} required />
          </label>
          <label>
            CVV
            <input data-testid="card-cvv" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} required />
          </label>
        </div>

        {error && <p data-testid="payment-error" className="error">{error}</p>}
        <button data-testid="pay-button" type="submit" disabled={submitting}>
          {submitting ? 'Processing…' : 'Pay now'}
        </button>
      </form>
    </div>
  )
}
