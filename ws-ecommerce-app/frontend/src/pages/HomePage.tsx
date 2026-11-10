import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { ProductCard } from '../components/ProductCard'
import type { Category, Product } from '../types'

function dollarsToCents(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const value = Number(trimmed)
  if (Number.isNaN(value) || value < 0) return undefined
  return Math.round(value * 100)
}

function centsToDollars(cents: string | null): string {
  if (!cents) return ''
  const n = Number(cents)
  if (Number.isNaN(n)) return ''
  return (n / 100).toString()
}

export function HomePage() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? ''
  const q = params.get('q') ?? ''
  const page = Number(params.get('page') ?? '0')
  const sort = params.get('sort') ?? 'id'
  const minPrice = params.get('minPrice')
  const maxPrice = params.get('maxPrice')
  const deals = params.get('deals') === '1'
  const inStockOnly = params.get('inStock') === '1'

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [featured, setFeatured] = useState<Product | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [minDollars, setMinDollars] = useState(centsToDollars(minPrice))
  const [maxDollars, setMaxDollars] = useState(centsToDollars(maxPrice))

  useEffect(() => {
    setMinDollars(centsToDollars(minPrice))
    setMaxDollars(centsToDollars(maxPrice))
  }, [minPrice, maxPrice])

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setError('Could not load categories'))
    api.getProducts({ category: 'electronics', size: 1 }).then((res) => {
      setFeatured(res.items[0] ?? null)
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    setLoading(true)
    api.getProducts({
      category: category || undefined,
      q: q || undefined,
      page,
      size: 20,
      sort: sort || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    })
      .then((res) => {
        setProducts(res.items)
        setTotal(res.total)
        setError('')
      })
      .catch((err) => setError(err.message || 'Could not load products'))
      .finally(() => setLoading(false))
  }, [category, q, page, sort, minPrice, maxPrice])

  const visibleProducts = useMemo(() => {
    let list = products
    if (inStockOnly) list = list.filter((p) => p.stockQuantity > 0)
    if (deals) list = list.filter((p) => p.id % 5 === 0)
    return list
  }, [products, inStockOnly, deals])

  const totalPages = Math.max(1, Math.ceil(total / 20))
  const showHero = !q && !category && page === 0 && !deals
  const activeCategoryName = categories.find((c) => c.slug === category)?.name ?? 'All departments'

  function patchParams(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params)
    mutate(next)
    next.delete('page')
    setParams(next)
  }

  function setCategory(slug: string) {
    patchParams((next) => {
      if (slug) next.set('category', slug)
      else next.delete('category')
      next.delete('deals')
    })
  }

  function setSort(value: string) {
    patchParams((next) => {
      if (value && value !== 'id') next.set('sort', value)
      else next.delete('sort')
    })
  }

  function applyPriceFilter(e: FormEvent) {
    e.preventDefault()
    patchParams((next) => {
      const minCents = dollarsToCents(minDollars)
      const maxCents = dollarsToCents(maxDollars)
      if (minCents !== undefined) next.set('minPrice', String(minCents))
      else next.delete('minPrice')
      if (maxCents !== undefined) next.set('maxPrice', String(maxCents))
      else next.delete('maxPrice')
    })
  }

  function toggleInStock() {
    patchParams((next) => {
      if (inStockOnly) next.delete('inStock')
      else next.set('inStock', '1')
    })
  }

  return (
    <div className="page">
      {showHero && (
        <>
          <section className="hero-banner">
            <div>
              <p className="hero-kicker">New season · Electronics</p>
              <h1>Small upgrades for big everyday moments.</h1>
              <p>
                From earbuds to monitors, Oakline electronics are picked for daily life —
                clear sound, clean design, and checkout that just works.
              </p>
              <div className="hero-actions">
                <Link className="button-link" to="/?category=electronics">Shop all electronics</Link>
                <Link className="button-link btn-outline" to="/?deals=1">Go to today&apos;s deals</Link>
              </div>
            </div>
            <div className="hero-feature">
              {featured && (
                <>
                  <img src={featured.imagePath} alt={featured.name} />
                  <div className="hero-feature-tag">
                    {featured.name} · ${(featured.priceCents / 100).toFixed(2)}
                  </div>
                </>
              )}
            </div>
          </section>

          <div className="trust-bar">
            <div className="trust-item"><div className="trust-icon">🚚</div><div><strong>Free shipping</strong><span>On orders over $50</span></div></div>
            <div className="trust-item"><div className="trust-icon">↩</div><div><strong>30 days return</strong><span>Hassle-free exchanges</span></div></div>
            <div className="trust-item"><div className="trust-icon">🔒</div><div><strong>Secure checkout</strong><span>Dummy cards for demos</span></div></div>
            <div className="trust-item"><div className="trust-icon">💬</div><div><strong>Real human support</strong><span>Mon–Fri, 9–6 CT</span></div></div>
          </div>

          <div className="section-head">
            <h2>Shop by department</h2>
            <Link to="/">View all</Link>
          </div>
          <div className="dept-grid">
            {categories.map((c) => (
              <Link key={c.id} className="dept-card" to={`/?category=${c.slug}`}>
                <span>{c.name}</span>
                <span>→</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="listing-shell">
        <aside className="filters-panel">
          <div className="filter-group">
            <h3>Departments</h3>
            <label className="filter-option">
              <input type="checkbox" checked={!category} onChange={() => setCategory('')} />
              All departments
            </label>
            {categories.map((c) => (
              <label key={c.id} className="filter-option">
                <input
                  type="checkbox"
                  checked={category === c.slug}
                  onChange={() => setCategory(category === c.slug ? '' : c.slug)}
                />
                {c.name}
              </label>
            ))}
          </div>
          <div className="filter-group">
            <h3>Price</h3>
            <form className="price-filter" onSubmit={applyPriceFilter}>
              <div className="row">
                <input data-testid="min-price" type="number" min={0} step="0.01" placeholder="Min" value={minDollars} onChange={(e) => setMinDollars(e.target.value)} />
                <input data-testid="max-price" type="number" min={0} step="0.01" placeholder="Max" value={maxDollars} onChange={(e) => setMaxDollars(e.target.value)} />
              </div>
              <button data-testid="price-filter-submit" type="submit">Apply price</button>
            </form>
          </div>
          <div className="filter-group">
            <h3>Availability</h3>
            <label className="filter-option">
              <input type="checkbox" checked={inStockOnly} onChange={toggleInStock} />
              In stock only
            </label>
          </div>
        </aside>

        <div className="listing-main">
          <div className="listing-toolbar">
            <div>
              <h2>{deals ? "Today's deals" : activeCategoryName}</h2>
              <p className="count">
                {loading ? 'Loading…' : `${page * 20 + 1}–${Math.min((page + 1) * 20, total)} of ${total}`}
                {q ? ` · “${q}”` : ''}
              </p>
            </div>
            <label>
              Sort by{' '}
              <select data-testid="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="id">Featured</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>

          <div className="filter-tags">
            {category && (
              <span className="filter-tag">
                {activeCategoryName}
                <button type="button" className="btn-ghost" onClick={() => setCategory('')}>×</button>
              </span>
            )}
            {inStockOnly && (
              <span className="filter-tag">
                In stock only
                <button type="button" className="btn-ghost" onClick={toggleInStock}>×</button>
              </span>
            )}
            {deals && (
              <span className="filter-tag">
                Deals
                <button type="button" className="btn-ghost" onClick={() => patchParams((n) => n.delete('deals'))}>×</button>
              </span>
            )}
          </div>

          {loading && <p>Loading products…</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && visibleProducts.length === 0 && (
            <p className="empty" data-testid="empty-results">No products matched your search.</p>
          )}

          <div className="product-grid" data-testid="product-grid">
            {visibleProducts.map((p) => (
              <ProductCard key={p.id} product={p} forceSale={deals} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pager">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => {
                  const next = new URLSearchParams(params)
                  next.set('page', String(page - 1))
                  setParams(next)
                }}
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page < 3 ? i : page - 2 + i
                if (p < 0 || p >= totalPages) return null
                return (
                  <button
                    key={p}
                    type="button"
                    className={p === page ? 'current' : ''}
                    onClick={() => {
                      const next = new URLSearchParams(params)
                      next.set('page', String(p))
                      setParams(next)
                    }}
                  >
                    {p + 1}
                  </button>
                )
              })}
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => {
                  const next = new URLSearchParams(params)
                  next.set('page', String(page + 1))
                  setParams(next)
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
