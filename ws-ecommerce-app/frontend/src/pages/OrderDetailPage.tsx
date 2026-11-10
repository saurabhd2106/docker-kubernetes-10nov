import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, api, formatMoney } from '../api'
import type { Order } from '../types'

export function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const orderId = Number(id)
    if (!orderId) {
      setError('Order not found')
      return
    }
    api.getOrder(orderId)
      .then(setOrder)
      .catch((err) => setError(err.message))
  }, [id])

  async function cancelOrder() {
    if (!order) return
    setError('')
    setCancelling(true)
    try {
      const next = await api.cancelOrder(order.id)
      setOrder(next)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel order')
    } finally {
      setCancelling(false)
    }
  }

  if (!order && error) return <div className="page"><p className="error">{error}</p></div>
  if (!order) return <div className="page"><p>Loading order…</p></div>

  const statusLabel = order.status === 'PAID'
    ? 'Paid'
    : order.status === 'CANCELLED'
      ? 'Cancelled'
      : order.status

  return (
    <div className="page narrow">
      <h1>Order confirmation</h1>
      <p>
        Order <strong data-testid="order-number">#{order.id}</strong>
        {' · '}
        <span data-testid="order-status">{statusLabel}</span>
      </p>
      <p data-testid="order-subtotal">
        Subtotal: <strong>{formatMoney(order.subtotalCents)}</strong>
      </p>
      <p data-testid="order-discount">
        Discount{order.promoCode ? ` (${order.promoCode})` : ''}:{' '}
        <strong>-{formatMoney(order.discountCents)}</strong>
      </p>
      <p data-testid="order-total">
        Total: <strong>{formatMoney(order.totalCents)}</strong>
      </p>
      <p data-testid="order-last4">Card ending {order.cardLast4}</p>
      <h2>Items</h2>
      <ul className="checkout-items">
        {order.items.map((item) => (
          <li data-testid="order-line" key={item.id}>
            {item.productName} × {item.quantity} — {formatMoney(item.lineTotalCents)}
          </li>
        ))}
      </ul>
      <h2>Shipping</h2>
      <p>
        {order.shippingName}<br />
        {order.shippingLine1}<br />
        {order.shippingCity}, {order.shippingRegion} {order.shippingPostal}
      </p>
      {order.status === 'PAID' && (
        <p>
          <button
            data-testid="cancel-order"
            type="button"
            onClick={cancelOrder}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling…' : 'Cancel order'}
          </button>
        </p>
      )}
      {error && <p data-testid="cancel-error" className="error">{error}</p>}
      <p>
        <Link to="/orders">View all orders</Link>
        {' · '}
        <Link to="/">Continue shopping</Link>
      </p>
    </div>
  )
}
