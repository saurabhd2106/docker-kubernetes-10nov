const KEY = 'oakline_wishlist'

export function getWishlist(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as number[]
  } catch {
    return []
  }
}

export function isWishlisted(productId: number): boolean {
  return getWishlist().includes(productId)
}

export function toggleWishlist(productId: number): boolean {
  const current = getWishlist()
  const next = current.includes(productId)
    ? current.filter((id) => id !== productId)
    : [...current, productId]
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('oakline-wishlist'))
  return next.includes(productId)
}

export function demoRating(productId: number) {
  const score = 3.8 + ((productId * 17) % 12) / 10
  const reviews = 40 + ((productId * 37) % 900)
  return { score: Math.round(score * 10) / 10, reviews }
}

export function demoComparePrice(priceCents: number, productId: number): number | null {
  if (productId % 5 !== 0) return null
  return Math.round(priceCents * 1.25)
}
