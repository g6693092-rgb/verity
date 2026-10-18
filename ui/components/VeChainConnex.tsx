'use client'

import { useState } from 'react'

type Props = { onLogged?: (address: string) => void }
type Connex = { vendor?: { connect?: () => Promise<unknown> }; thor?: { account?: () => { address?: string } } }

export default function VeChainConnex({ onLogged }: Props) {
  const [status, setStatus] = useState('idle')
  const [address, setAddress] = useState('')

  async function connect() {
    setStatus('connecting')
    try {
      const connex = (window as Window & { connex?: Connex }).connex
      if (!connex?.vendor) { setStatus('no-connex'); return }
      await connex.vendor.connect?.()
      const nextAddress = connex.thor?.account?.().address ?? ''
      if (!nextAddress) { setStatus('no-account'); return }
      setAddress(nextAddress)
      setStatus('connected')
      onLogged?.(nextAddress)
    } catch { setStatus('error') }
  }

  return <div className="rounded-lg border border-[#dfe7ef] bg-white p-3 text-xs">
    <p className="font-semibold text-[#142641]">VeChain wallet</p>
    <p className="mt-1 break-all text-[#718097]">{address || 'Not connected'}</p>
    <button type="button" onClick={connect} disabled={status === 'connecting'} className="mt-3 rounded-md bg-[#142641] px-3 py-2 font-semibold text-white disabled:opacity-60">
      {status === 'connecting' ? 'Connecting…' : 'Connect Connex'}
    </button>
    {status === 'no-connex' && <p className="mt-2 text-amber-700">Open this app inside VeWorld or VeChainThor.</p>}
    {status === 'no-account' && <p className="mt-2 text-amber-700">Unlock an account in the wallet.</p>}
    {status === 'error' && <p className="mt-2 text-red-700">Wallet connection failed.</p>}
  </div>
}
