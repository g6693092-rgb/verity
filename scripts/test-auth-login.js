#!/usr/bin/env node
const { Wallet } = require("ethers")

const backend = process.env.BACKEND_URL || "http://localhost:3000"
const privateKey = process.env.TEST_WALLET_PK

if (!privateKey) {
  console.error("TEST_WALLET_PK is required")
  process.exit(2)
}

async function request(path, options = {}) {
  const response = await fetch(`${backend}${path}`, options)
  const text = await response.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  if (!response.ok) throw new Error(`${path} failed with ${response.status}: ${text}`)
  return body
}

async function main() {
  const wallet = new Wallet(privateKey)
  const nonce = await request(`/auth/nonce/${wallet.address}`)
  const signature = await wallet.signMessage(`Verity login nonce: ${nonce.nonce}`)
  const login = await request("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: wallet.address, signature }),
  })
  await request("/auth/me", { headers: { authorization: `Bearer ${login.token}` } })
  console.log(`Wallet auth smoke test passed for ${wallet.address}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
