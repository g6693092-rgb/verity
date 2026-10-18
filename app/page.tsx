'use client'

import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''
type DashboardData = { stats: { totalClaims: number; verifiedClaims: number; proofsGenerated: number; privateDataRetained: number }; claims: Array<{ id?: string; claimId?: string; product?: string; type?: string; status?: string; createdAt?: string; date?: string; commitment?: string; proof?: string }> ; network: string }

type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
declare global { interface Window { ethereum?: EthereumProvider } }
import {
  ArrowUpRight,
  BadgeCheck,
  Box,
  ChevronDown,
  CircleHelp,
  Copy,
  FileCheck2,
  Fingerprint,
  Globe2,
  LockKeyhole,
  Menu,
  Network,
  Plus,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Truck,
  Wallet,
  X,
  Zap,
} from 'lucide-react'

export default function Page() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Overview')
  const [connected, setConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [attestationOpen, setAttestationOpen] = useState(false)
  const [assetReference, setAssetReference] = useState('')
  const [productName, setProductName] = useState('')
  const [proofStatus, setProofStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)

  async function loadDashboard(token: string) {
    const response = await fetch(`${API_URL}/dashboard`, { headers: { authorization: `Bearer ${token}` }, credentials: 'include' })
    if (!response.ok) throw new Error('Could not load dashboard data')
    setDashboard(await response.json() as DashboardData)
  }

  async function connectWallet() {
    if (!window.ethereum) { setProofStatus('Install MetaMask to connect a wallet.'); return }
    setBusy(true)
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
      const address = accounts[0]
      if (!address) throw new Error('No wallet selected')
      const api = process.env.NEXT_PUBLIC_API_URL ?? ''
      const nonceResponse = await fetch(`${api}/auth/nonce/${address}`)
      if (!nonceResponse.ok) throw new Error('Could not request wallet nonce')
      const { nonce } = await nonceResponse.json() as { nonce: string }
      const signature = await window.ethereum.request({ method: 'personal_sign', params: [nonce, address] }) as string
      const loginResponse = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ address, signature }) })
      if (!loginResponse.ok) throw new Error('Wallet signature was rejected')
      const login = await loginResponse.json() as { token?: string }
      setWalletAddress(address)
      const token = login.token ?? ''
      setAuthToken(token)
      setConnected(true)
      await loadDashboard(token)
      setProofStatus('Wallet authenticated and dashboard loaded.')
    } catch (error) { setProofStatus(error instanceof Error ? error.message : 'Wallet connection failed.') }
    finally { setBusy(false) }
  }

  function copyAddress() {
    navigator.clipboard?.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  async function generateProof() {
    if (!authToken && !connected) { setProofStatus('Connect your wallet first.'); return }
    if (!assetReference.trim() || !productName.trim()) { setProofStatus('Enter a claim ID and product name.'); return }
    setBusy(true)
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? ''
      const headers = { 'content-type': 'application/json', ...(authToken ? { authorization: `Bearer ${authToken}` } : {}) }
      const claimResponse = await fetch(`${api}/claims`, { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ claimId: assetReference.trim(), product: productName.trim(), owner: walletAddress, createdAt: new Date().toISOString(), status: 'created' }) })
      const claim = await claimResponse.json() as { error?: string }
      if (!claimResponse.ok) throw new Error(claim.error ?? 'Could not create claim')
      const response = await fetch(`${api}/prove-async`, { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ claimId: assetReference.trim() }) })
      const result = await response.json() as { jobId?: string; error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not queue proof')
      await loadDashboard(authToken)
      setProofStatus(`Claim created and proof queued: ${result.jobId}`)
      setAssetReference('')
      setProductName('')
      setAttestationOpen(false)
    } catch (error) { setProofStatus(error instanceof Error ? error.message : 'Proof request failed.') }
    finally { setBusy(false) }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#162033]">
      <header className="border-b border-[#e6eaf0] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 lg:px-10">
          <div className="flex items-center gap-10">
            <a className="flex items-center gap-2.5" href="#top" aria-label="Veridion home">
              <span className="grid size-8 place-items-center rounded-[10px] bg-[#142641] text-white"><Fingerprint size={18} strokeWidth={2.5} /></span>
              <span className="text-[17px] font-semibold tracking-[-0.03em]">veridion<span className="text-[#20b486]">.</span></span>
            </a>
            <nav className="hidden items-center gap-7 text-[13px] font-medium text-[#778399] md:flex" aria-label="Main navigation">
              {['Overview', 'Attestations', 'DPP Registry', 'Verifiers'].map((item) => <button key={item} onClick={() => setActiveTab(item)} className={activeTab === item ? 'text-[#142641]' : 'hover:text-[#142641]'}>{item}</button>)}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-[#dce5e4] bg-[#f4fbf8] px-3 py-1.5 text-[11px] font-semibold text-[#168568] sm:flex"><span className="size-1.5 rounded-full bg-[#20b486]" /> VeChain Testnet</span>
            <button onClick={connectWallet} disabled={busy} className="hidden items-center gap-2 rounded-lg bg-[#142641] px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#20395c] disabled:opacity-60 sm:flex"><Wallet size={14} /> {connected ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'Connect wallet'} <ChevronDown size={13} /></button>
            <button className="rounded-lg p-2 text-[#65738a] md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">{mobileOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
        {mobileOpen && <nav className="flex flex-col gap-4 border-t border-[#e6eaf0] bg-white px-5 py-5 text-sm md:hidden">{['Overview', 'Attestations', 'DPP Registry', 'Verifiers'].map((item) => <button className="text-left" key={item} onClick={() => { setActiveTab(item); setMobileOpen(false) }}>{item}</button>)}<button onClick={() => setConnected(!connected)} className="flex items-center gap-2 rounded-lg bg-[#142641] px-3 py-2 text-left font-semibold text-white"><Wallet size={14} /> {connected ? '0x4a19…c82f' : 'Connect wallet'}</button></nav>}
      </header>

      <div id="top" className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10 lg:py-11">
        <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#20a980]"><Sparkles size={13} /> Privacy-preserving infrastructure</div><h1 className="text-3xl font-semibold tracking-[-0.045em] text-[#142641] sm:text-[40px]">RWA Attestation Protocol</h1><p className="mt-2 max-w-xl text-[14px] leading-6 text-[#718097]">Prove what matters. Keep what&apos;s private. A verification layer for the physical world, secured on VeChain.</p></div>
          <button onClick={() => setAttestationOpen(true)} className="flex w-fit items-center gap-2 rounded-lg bg-[#20b486] px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_5px_16px_rgba(32,180,134,0.2)] transition hover:bg-[#159b70]"><Plus size={15} /> Create attestation</button>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={<ShieldCheck />} label="Verified assets" value={dashboard ? String(dashboard.stats.verifiedClaims) : '—'} delta={dashboard ? 'live' : 'connect wallet'} tone="green" />
          <Stat icon={<FileCheck2 />} label="Proofs generated" value={dashboard ? String(dashboard.stats.proofsGenerated) : '—'} delta={dashboard ? 'live' : 'connect wallet'} tone="blue" />
          <Stat icon={<LockKeyhole />} label="Private data retained" value={dashboard ? `${dashboard.stats.privateDataRetained}%` : '—'} delta={dashboard ? 'filesystem backend' : 'connect wallet'} tone="purple" />
          <Stat icon={<Zap />} label="Avg. verification" value="1.8s" delta="−24.2%" tone="orange" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-xl border border-[#e3e8ef] bg-white p-5 shadow-[0_4px_20px_rgba(20,38,65,0.025)] sm:p-6">
            <div className="mb-7 flex items-start justify-between"><div><h2 className="text-[15px] font-semibold text-[#142641]">Attestation activity</h2><p className="mt-1 text-xs text-[#8b97a9]">Proof generation across your asset registry</p></div><button className="flex items-center gap-1.5 rounded-md border border-[#e5e9ef] px-2.5 py-1.5 text-[11px] font-medium text-[#617087]">Last 30 days <ChevronDown size={12} /></button></div>
            <div className="flex h-48 items-end gap-1.5 sm:gap-3">{[34,46,39,58,50,65,54,72,61,79,74,90,83,95,88,100,78,86,92,100,94,100,97,100,95,100,91,100,99,100].map((h, i) => <div key={i} className="group flex flex-1 flex-col justify-end gap-2"><div className="relative w-full rounded-t-[3px] bg-[#dff5ed] transition group-hover:bg-[#20b486]" style={{ height: `${h}%` }}><span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-[#142641] px-1.5 py-1 text-[9px] text-white group-hover:block">{Math.round(h * 9.2)}</span></div></div>)}</div>
            <div className="mt-4 flex justify-between text-[10px] font-medium text-[#a0aaba]"><span>19 Sep</span><span>26 Sep</span><span>03 Oct</span><span>10 Oct</span><span>18 Oct</span></div>
          </div>
          <div className="rounded-xl border border-[#e3e8ef] bg-[#142641] p-6 text-white shadow-[0_4px_20px_rgba(20,38,65,0.1)]"><div className="mb-8 flex items-center justify-between"><div className="flex items-center gap-2 text-[13px] font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-white/10"><Network size={15} /></span> Network status</div><span className="flex items-center gap-1.5 rounded-full bg-[#20b486]/15 px-2.5 py-1 text-[10px] font-semibold text-[#62e5ba]"><span className="size-1.5 rounded-full bg-[#62e5ba]" /> Operational</span></div><div className="mb-7"><p className="mb-1 text-[11px] text-[#8ea0b8]">VeChain Thor · Testnet</p><p className="text-2xl font-semibold tracking-[-0.04em]">10,284,991 <span className="text-sm font-normal text-[#8ea0b8]">block height</span></p></div><div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-5"><div><p className="text-[10px] text-[#8ea0b8]">Gas price</p><p className="mt-1 text-sm font-medium">1.00 VTHO</p></div><div><p className="text-[10px] text-[#8ea0b8]">Finality</p><p className="mt-1 text-sm font-medium">~10 sec</p></div></div><a href="https://explore-testnet.vechain.org" target="_blank" rel="noreferrer" className="mt-7 flex items-center gap-1 text-[11px] font-semibold text-[#62e5ba]">Open VeChain Explorer <ArrowUpRight size={13} /></a></div>
        </section>

        <section className="mt-6 rounded-xl border border-[#e3e8ef] bg-white p-5 shadow-[0_4px_20px_rgba(20,38,65,0.025)] sm:p-6"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-[15px] font-semibold text-[#142641]">Recent attestations</h2><p className="mt-1 text-xs text-[#8b97a9]">Latest zero-knowledge proofs anchored to VeChain</p></div><button className="flex items-center gap-1.5 text-[11px] font-semibold text-[#188d6b]">View registry <ArrowUpRight size={13} /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-[#edf0f4] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9ca6b5]"><th className="pb-3 font-semibold">Asset</th><th className="pb-3 font-semibold">Attestation type</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 font-semibold">Created</th><th className="pb-3 font-semibold">Proof ID</th><th /></tr></thead><tbody>{(dashboard?.claims ?? []).map((a) => <tr key={a.id} className="border-b border-[#f0f2f5] last:border-0"><td className="py-4"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-[#f0f5fb] text-[#557293]"><Box size={15} /></span><div><p className="text-[12px] font-semibold text-[#26364c]">{a.product}</p><p className="mt-0.5 text-[10px] text-[#9aa5b4]">{a.id}</p></div></div></td><td className="py-4 text-[11px] text-[#637188]">{a.type}</td><td className="py-4"><span className={a.status === 'Verified' ? 'inline-flex items-center gap-1.5 rounded-full bg-[#e8f8f2] px-2 py-1 text-[10px] font-semibold text-[#158363]' : 'inline-flex items-center gap-1.5 rounded-full bg-[#fff6e7] px-2 py-1 text-[10px] font-semibold text-[#b77919]'}><span className="size-1.5 rounded-full bg-current" />{a.status}</span></td><td className="py-4 text-[11px] text-[#637188]">{a.date}</td><td className="py-4 font-mono text-[10px] text-[#8995a7]">{a.proof}</td><td className="py-4 text-right"><button onClick={copyAddress} className="rounded-md p-2 text-[#93a0b1] hover:bg-[#f2f5f8] hover:text-[#142641]" aria-label="Copy proof ID"><Copy size={14} /></button></td></tr>)}</tbody></table></div>{copied && <p className="mt-3 text-right text-[11px] font-medium text-[#20a980]">Proof ID copied to clipboard</p>}</section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3"><InfoCard icon={<ScanLine />} title="Privacy by default" text="Selective disclosure lets you prove compliance without exposing commercial data." /><InfoCard icon={<Truck />} title="Physical to digital" text="Turn supply-chain events into verifiable credentials for every asset." /><InfoCard icon={<Globe2 />} title="Built for scale" text="Low-cost attestations on VeChain, ready for enterprise volume." /></section>
        <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-[#e3e8ef] py-6 text-[11px] text-[#9aa5b4] sm:flex-row"><span>Veridion Protocol · v0.1.0 testnet</span><span className="flex gap-5"><a href="#docs" className="hover:text-[#142641]">Protocol docs</a><a href="#status" className="hover:text-[#142641]">Status</a><a href="#support" className="hover:text-[#142641]">Support</a></span></footer>
      </div>
      {attestationOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-[#142641]/40 px-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="attestation-title">
        <div className="w-full max-w-lg rounded-2xl border border-[#e3e8ef] bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#20a980]">VeChain testnet</p><h2 id="attestation-title" className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#142641]">Create a private attestation</h2><p className="mt-1 text-xs leading-5 text-[#7c899b]">Generate a selective-disclosure proof without publishing the underlying supply-chain data.</p></div><button onClick={() => setAttestationOpen(false)} aria-label="Close dialog" className="rounded-md p-1 text-[#8390a2] hover:bg-[#f1f4f7]"><X /></button></div>
          <div className="mt-6 grid gap-3"><label className="grid gap-1.5 text-[11px] font-semibold text-[#526177]">Claim ID<input value={assetReference} onChange={(event) => setAssetReference(event.target.value)} className="rounded-lg border border-[#dfe6ed] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#20b486]" placeholder="e.g. claim-1842" /></label><label className="grid gap-1.5 text-[11px] font-semibold text-[#526177]">Product<input value={productName} onChange={(event) => setProductName(event.target.value)} className="rounded-lg border border-[#dfe6ed] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#20b486]" placeholder="e.g. Arabica Coffee Lot 1842" /></label><label className="grid gap-1.5 text-[11px] font-semibold text-[#526177]">Proof claims<select className="rounded-lg border border-[#dfe6ed] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#20b486]"><option>Authenticity + cold-chain compliance</option><option>Origin + carbon footprint</option><option>Regulatory compliance</option></select></label></div>
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-[#f0faf6] px-3 py-2.5 text-[11px] text-[#347b68]"><ShieldCheck size={15} /> Private witness data stays off-chain; only the proof commitment is anchored.</div>{proofStatus && <p role="status" className="mt-3 text-[11px] text-[#637188]">{proofStatus}</p>}
          <div className="mt-6 flex justify-end gap-2"><button onClick={() => setAttestationOpen(false)} className="rounded-lg px-3.5 py-2 text-[12px] font-semibold text-[#66758a] hover:bg-[#f1f4f7]">Cancel</button><button onClick={generateProof} disabled={busy} className="rounded-lg bg-[#142641] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#20395c] disabled:opacity-60">{busy ? 'Submitting…' : 'Generate ZK proof'}</button></div>
        </div>
      </div>}
    </main>
  )
}

function Stat({ icon, label, value, delta, tone }: { icon: React.ReactNode; label: string; value: string; delta: string; tone: string }) { return <div className="rounded-xl border border-[#e3e8ef] bg-white p-5 shadow-[0_4px_20px_rgba(20,38,65,0.025)]"><div className="mb-5 flex items-center justify-between"><span className={`grid size-8 place-items-center rounded-lg ${tone === 'green' ? 'bg-[#e8f8f2] text-[#20a980]' : tone === 'blue' ? 'bg-[#edf4ff] text-[#5283c4]' : tone === 'purple' ? 'bg-[#f2efff] text-[#8974cc]' : 'bg-[#fff4e7] text-[#d8923d]'}`}>{icon}</span><span className="text-[10px] font-semibold text-[#20a980]">{delta}</span></div><p className="text-[11px] font-medium text-[#8b97a9]">{label}</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#142641]">{value}</p></div> }
function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex gap-4 rounded-xl border border-[#e3e8ef] bg-white p-5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf8f5] text-[#20a980]">{icon}</span><div><h3 className="text-[12px] font-semibold text-[#26364c]">{title}</h3><p className="mt-1 text-[11px] leading-5 text-[#8793a5]">{text}</p></div></div> }
