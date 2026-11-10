import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, clearAuth, getStoredAuth, storeAuth } from './api'
import type { AuthUser, Cart } from './types'

interface AuthContextValue {
  user: AuthUser | null
  cart: Cart | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, displayName?: string) => Promise<void>
  logout: () => void
  refreshCart: () => Promise<void>
  setCart: (cart: Cart | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuth())
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshCart = useCallback(async () => {
    if (!getStoredAuth()) {
      setCart(null)
      return
    }
    const next = await api.getCart()
    setCart(next)
  }, [])

  useEffect(() => {
    async function bootstrap() {
      const stored = getStoredAuth()
      if (!stored) {
        setLoading(false)
        return
      }
      try {
        const me = await api.me()
        setUser({ token: stored.token, username: me.username, displayName: me.displayName })
        await refreshCart()
      } catch {
        clearAuth()
        setUser(null)
        setCart(null)
      } finally {
        setLoading(false)
      }
    }
    void bootstrap()
  }, [refreshCart])

  const login = useCallback(async (username: string, password: string) => {
    const auth = await api.login({ username, password })
    storeAuth(auth)
    setUser(auth)
    await refreshCart()
  }, [refreshCart])

  const register = useCallback(async (username: string, password: string, displayName?: string) => {
    const auth = await api.register({ username, password, displayName })
    storeAuth(auth)
    setUser(auth)
    await refreshCart()
  }, [refreshCart])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
    setCart(null)
  }, [])

  const value = useMemo(
    () => ({ user, cart, loading, login, register, logout, refreshCart, setCart }),
    [user, cart, loading, login, register, logout, refreshCart],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
