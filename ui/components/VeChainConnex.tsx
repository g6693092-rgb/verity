'use client'

import { useEffect, useRef, useState } from 'react'

type Props = { onLogged?: (address: string) => void }
type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
type Connex = {
  vendor?: {
    connect?: () => Promise<unknown>
    request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    accounts?: string[]
  }
  thor?: { account?: () => { address?: string } }
}
type Venom = {
  enable?: () => Promise<unknown>
  request?: (args: { method: string }) => Promise<unknown>
  accounts?: string[]
  _accounts?: string[]
  isConnected?: () => boolean
}
type GlobalWallets = Window & { connex?: Connex; venom?: Venom; ethereum?: Eip1193 }

type Status = 'idle' | 'detecting' | 'connecting' | 'connected' | 'no-connex' | 'no-account' | 'error'

function wallets() {
  return typeof window === 'undefined' ? {} as GlobalWallets : window as GlobalWallets
}

export default function VeChainConnex({ onLogged }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [address, setAddress] = useState('')
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    setStatus('detecting')
    let tries = 0
    pollRef.current = window.setInterval(() => {
      tries += 1
      const global = wallets()
      if (global.connex || global.venom || global.ethereum) {
        setStatus('idle')
        if (pollRef.current) window.clearInterval(pollRef.current)
        pollRef.current = null
      } else if (tries >= 20) {
        setStatus('no-connex')
        if (pollRef.current) window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }, 100)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const account = wallets().connex?.thor?.account?.().address ?? wallets().connex?.vendor?.accounts?.[0] ?? ''
      if (account && account !== address) {
        setAddress(account)
        setStatus('connected')
        onLogged?.(account)
      }
    }, 1000)
    return () => window.clearInterval(interval)
  }, [address, onLogged])

  async function connect() {
    setStatus('connecting')
    const global = wallets()
    try {
      const connex = global.connex
      if (connex) {
        if (typeof connex.vendor?.connect === 'function') await connex.vendor.connect()
        else if (typeof connex.vendor?.request === 'function') await connex.vendor.request({ method: 'eth_requestAccounts' })
        const account = connex.thor?.account?.().address ?? connex.vendor?.accounts?.[0] ?? ''
        if (!account) { setStatus('no-account'); return }
        setAddress(account)
        setStatus('connected')
        onLogged?.(account)
        return
      }

      const venom = global.venom
      if (venom) {
        if (venom.enable) await venom.enable()
        else if (venom.request) await venom.request({ method: 'venom_requestAccounts' })
        const account = venom.accounts?.[0] ?? venom._accounts?.[0] ?? ''
        if (account) {
          setAddress(account)
          setStatus('connected')
          onLogged?.(account)
          return
        }
      }

      if (global.ethereum) {
        const result = await global.ethereum.request({ method: 'eth_requestAccounts' })
        const account = Array.isArray(result) && typeof result[0] === 'string' ? result[0] : ''
        if (account) {
          setAddress(account)
          setStatus('connected')
          onLogged?.(account)
          return
        }
      }
      setStatus('no-connex')
    } catch (error) {
      console.error('[v0] VeChain wallet connection failed', error)
      setStatus('error')
    }
  }

  return <div className="rounded-lg border border-[#dfe7ef] bg-white p-3 text-xs">
    <p className="font-semibold text-[#142641]">VeChain wallet</p>
    <p className="mt-1 break-all text-[#718097]">{address || 'Not connected'}</p>
    <button type="button" onClick={connect} disabled={status === 'connecting'} className="mt-3 rounded-md bg-[#142641] px-3 py-2 font-semibold text-white disabled:opacity-60">
      {status === 'connecting' ? 'Connecting…' : status === 'connected' ? 'Reconnect' : 'Connect wallet'}
    </button>
    {status === 'detecting' && <p className="mt-2 text-[#718097]">Searching for wallet provider…</p>}
    {status === 'no-connex' && <p className="mt-2 text-amber-700">Open this app inside VeWorld or VeChainThor.</p>}
    {status === 'no-account' && <p className="mt-2 text-amber-700">Unlock an account in the wallet.</p>}
    {status === 'error' && <p className="mt-2 text-red-700">Wallet connection failed. Check the wallet console.</p>}
  </div>
}
