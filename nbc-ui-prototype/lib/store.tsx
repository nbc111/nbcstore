"use client"

import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react"
import { PRODUCTS, type Product } from "./data"

type CartLine = { product: Product; qty: number }

type StoreState = {
  // wallet
  connected: boolean
  address: string | null
  balance: number // NBC
  connect: () => void
  disconnect: () => void
  // cart
  cart: CartLine[]
  cartCount: number
  cartTotalCny: number
  addToCart: (product: Product, qty?: number) => void
  removeFromCart: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
}

const StoreContext = createContext<StoreState | null>(null)

const DEMO_ADDRESS = "0x7F3a...9E2b"

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState(1284500)
  const [cart, setCart] = useState<CartLine[]>([
    { product: PRODUCTS[0], qty: 1 },
    { product: PRODUCTS[2], qty: 2 },
  ])

  useEffect(() => {
    try {
      if (localStorage.getItem("nbc_connected") === "1") {
        setConnected(true)
        setAddress(DEMO_ADDRESS)
      }
    } catch {}
  }, [])

  const connect = useCallback(() => {
    setConnected(true)
    setAddress(DEMO_ADDRESS)
    try {
      localStorage.setItem("nbc_connected", "1")
    } catch {}
  }, [])

  const disconnect = useCallback(() => {
    setConnected(false)
    setAddress(null)
    try {
      localStorage.removeItem("nbc_connected")
    } catch {}
  }, [])

  const addToCart = useCallback((product: Product, qty = 1) => {
    setCart((prev) => {
      const found = prev.find((l) => l.product.id === product.id)
      if (found) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + qty } : l))
      }
      return [...prev, { product, qty }]
    })
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== id))
  }, [])

  const updateQty = useCallback((id: string, qty: number) => {
    setCart((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, qty: Math.max(1, qty) } : l)),
    )
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const cartCount = cart.reduce((s, l) => s + l.qty, 0)
  const cartTotalCny = cart.reduce((s, l) => s + l.qty * l.product.priceCny, 0)

  const value = useMemo<StoreState>(
    () => ({
      connected,
      address,
      balance,
      connect,
      disconnect,
      cart,
      cartCount,
      cartTotalCny,
      addToCart,
      removeFromCart,
      updateQty,
      clearCart,
    }),
    [connected, address, balance, cart, cartCount, cartTotalCny, connect, disconnect, addToCart, removeFromCart, updateQty, clearCart],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}
