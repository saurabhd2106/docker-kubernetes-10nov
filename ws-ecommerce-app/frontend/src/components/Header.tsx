import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import type { Category } from '../types'

export function Header() {
  const { user, cart, logout } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState(params.get('category') ?? '')
  const [categories, setCategories] = useState<Category[]>([])
  const [wishlistCount, setWishlistCount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('oakline_wishlist') || '[]').length
    } catch {
      return 0
    }
  })

  useEffect(() => {
    setQ(params.get('q') ?? '')
    setCategory(params.get('category') ?? '')
  }, [params])

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const sync = () => {
      try {
        setWishlistCount(JSON.parse(localStorage.getItem('oakline_wishlist') || '[]').length)
      } catch {
        setWishlistCount(0)
      }
    }
    window.addEventListener('oakline-wishlist', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('oakline-wishlist', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const next = new URLSearchParams(params)
    const query = q.trim()
    if (query) next.set('q', query)
    else next.delete('q')
    if (category) next.set('category', category)
    else next.delete('category')
    next.delete('page')
    const qs = next.toString()
    navigate(qs ? `/?${qs}` : '/')
  }

  function goCategory(slug: string) {
    const next = new URLSearchParams()
    if (slug) next.set('category', slug)
    navigate(next.toString() ? `/?${next}` : '/')
  }

  return (
    <>
      <div className="promo-bar">
        <div className="promo-bar-inner">
          <span>Free shipping on orders over $50 · Shop now</span>
          <div className="promo-bar-links">
            <Link to="/register">Register</Link>
            <Link to="/orders">Track order</Link>
            <a href="#site-footer">Help Center</a>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="header-main">
          <Link to="/" className="brand">
            <span className="brand-mark">O</span>
            Oakline
          </Link>
          <form className="search-form" onSubmit={onSearch}>
            <select
              data-testid="search-category"
              className="search-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Search category"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <input
              data-testid="search-input"
              type="search"
              placeholder="Search for products, brands and more..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button data-testid="search-submit" type="submit" aria-label="Search">⌕</button>
          </form>
          <div className="header-actions">
            {user ? (
              <div className="header-action">
                <span>Hello, {user.displayName}</span>
                <strong>
                  <button type="button" className="linkish" onClick={logout}>Account · Logout</button>
                </strong>
              </div>
            ) : (
              <Link to="/login" className="header-action">
                <span>Hello, Guest</span>
                <strong>Account</strong>
              </Link>
            )}
            <button type="button" className="icon-btn" aria-label="Wishlist" title="Wishlist">
              ♡
              {wishlistCount > 0 && <span className="badge-count">{wishlistCount}</span>}
            </button>
            <Link data-testid="cart-link" to="/cart" className="icon-btn" aria-label="Cart">
              👜
              <span data-testid="cart-count" className="badge-count">{cart?.itemCount ?? 0}</span>
            </Link>
          </div>
        </div>
        <nav className="category-nav" aria-label="Departments">
          <div className="category-nav-inner">
            <button
              type="button"
              className={!category ? 'active' : ''}
              onClick={() => goCategory('')}
            >
              All departments
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={category === c.slug ? 'active' : ''}
                onClick={() => goCategory(c.slug)}
              >
                {c.name}
              </button>
            ))}
            <Link className="deals" to="/?deals=1">Today&apos;s deals</Link>
          </div>
        </nav>
      </header>
    </>
  )
}
