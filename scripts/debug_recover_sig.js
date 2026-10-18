#!/usr/bin/env node
const { ethers } = require('ethers')

const [, , message, signature] = process.argv
if (!message || !signature) {
  console.error('Usage: node scripts/debug_recover_sig.js "<message>" "<signature>"')
  process.exit(2)
}

const normalized = signature.startsWith('0x') ? signature : `0x${signature}`
for (const [name, fn] of [
  ['verifyMessage', () => ethers.verifyMessage(message, normalized)],
  ['recoverAddress(hashMessage)', () => ethers.recoverAddress(ethers.hashMessage(message), normalized)],
]) {
  try { console.log(`${name} -> ${fn()}`) }
  catch (error) { console.error(`${name} failed: ${error instanceof Error ? error.message : String(error)}`) }
}
