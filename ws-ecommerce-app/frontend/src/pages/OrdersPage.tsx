import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatMoney } from '../api'
import type { Order } from '../types'

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getOrders()
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <h1>Your orders</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && orders.length === 0 && <p className="empty">No orders yet.</p>}
      <div className="order-list">
        {orders.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`} className="order-card">
            <div>
              <strong data-testid="order-number">Order #{order.id}</strong>
              <p className="muted">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p data-testid="order-total">{formatMoney(order.totalCents)}</p>
              <p className="muted" data-testid="order-status">
                {order.status === 'PAID' ? 'Paid' : order.status === 'CANCELLED' ? 'Cancelled' : order.status}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
