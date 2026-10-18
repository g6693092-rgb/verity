'use client'

export default function OpenInVeChainButton({ url }: { url?: string }) {
  function openWallet() {
    const target = url ?? window.location.href
    window.location.href = `vechain://open?url=${encodeURIComponent(target)}`
  }

  return <button type="button" onClick={openWallet} className="rounded-md border border-[#dfe7ef] px-3 py-2 text-xs font-semibold text-[#142641] hover:border-[#20b486]">Open in VeChain wallet</button>
}
