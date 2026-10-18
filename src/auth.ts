import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { ethers } from "ethers"
import type { Request, Response, NextFunction } from "express"

const authDir = path.resolve(process.env.DATA_DIR ?? "data", "auth")
const nonceTtlMs = 5 * 60 * 1000
const sessionTtlMs = 8 * 60 * 60 * 1000
fs.mkdirSync(authDir, { recursive: true })

const secret = () => process.env.JWT_SECRET ?? ""
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url")
const sign = (header: string, payload: string) => crypto.createHmac("sha256", secret()).update(`${header}.${payload}`).digest("base64url")
function token(payload: Record<string, unknown>) {
  const header = encode({ alg: "HS256", typ: "JWT" })
  const body = encode(payload)
  return `${header}.${body}.${sign(header, body)}`
}
function verify(value: string) {
  const [header, body, signature] = value.split(".")
  if (!header || !body || !signature || !secret()) return null
  const expected = sign(header, body)
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
    return payload.exp > Date.now() ? payload : null
  } catch { return null }
}
const addressFile = (address: string) => path.join(authDir, `${address.toLowerCase()}.json`)
const read = <T>(file: string): T | null => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) as T : null
const write = (file: string, value: unknown) => fs.writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 })

type WalletRecord = { address: string; role: "USER" | "ADMIN"; createdAt: string; nonce?: string; nonceExpiresAt?: number }
export type AuthRequest = Request & { user?: { address: string; role: "USER" | "ADMIN" } }

export function registerAuth(app: { get: Function; post: Function }) {
  app.get("/auth/nonce/:address", (req: Request, res: Response) => {
    const address = String(req.params.address ?? "")
    if (!ethers.isAddress(address)) return res.status(400).json({ error: "Invalid wallet address" })
    const key = address.toLowerCase()
    const record = read<WalletRecord>(addressFile(key)) ?? { address: key, role: "USER", createdAt: new Date().toISOString() }
    record.nonce = crypto.randomBytes(24).toString("hex")
    record.nonceExpiresAt = Date.now() + nonceTtlMs
    write(addressFile(key), record)
    res.json({ address: key, nonce: record.nonce, expiresAt: record.nonceExpiresAt, message: `Verity login nonce: ${record.nonce}` })
  })

  app.get("/auth/nonce-vechain", (_req: Request, res: Response) => {
    const nonce = crypto.randomBytes(24).toString("hex")
    const file = path.join(authDir, `pending-${nonce}.json`)
    write(file, { nonce, nonceExpiresAt: Date.now() + nonceTtlMs })
    res.json({ nonce, expiresAt: Date.now() + nonceTtlMs })
  })

  function recoverSignature(message: string, signature: string) {
    const attempts: Array<{ method: string; recovered?: string; error?: string }> = []
    const normalized = signature.startsWith("0x") ? signature : `0x${signature}`
    for (const [method, recover] of [
      ["verifyMessage", () => ethers.verifyMessage(message, normalized)],
      ["recoverAddress(hashMessage)", () => ethers.recoverAddress(ethers.hashMessage(message), normalized)],
    ] as const) {
      try { attempts.push({ method, recovered: recover() }) } catch (error) { attempts.push({ method, error: error instanceof Error ? error.message : String(error) }) }
    }
    return attempts
  }

  app.post("/auth/login-vechain", (req: Request, res: Response) => {
    if (!secret()) return res.status(503).json({ error: "JWT authentication is not configured" })
    const address = String(req.body?.address ?? "").toLowerCase()
    const signature = String(req.body?.signature ?? "")
    const message = String(req.body?.message ?? "")
    if (!ethers.isAddress(address) || !signature || !message || message.length > 1024) return res.status(400).json({ error: "Valid VeChain address, message and signature are required" })
    const nonce = message.replace(/^Verity VeChain login nonce: /, "")
    const pendingFile = path.join(authDir, `pending-${nonce}.json`)
    const pending = read<{ nonce: string; nonceExpiresAt: number }>(pendingFile)
    if (!pending?.nonce || pending.nonceExpiresAt < Date.now() || pending.nonce !== nonce || message !== `Verity VeChain login nonce: ${nonce}`) return res.status(401).json({ error: "Nonce expired or invalid" })
    const attempts = recoverSignature(message, signature)
    const recovered = attempts.find((attempt) => attempt.recovered?.toLowerCase() === address)?.recovered
    if (!recovered) {
      const details = process.env.NODE_ENV === "production" ? undefined : attempts
      return res.status(401).json({ error: "Invalid VeChain signature", ...(details ? { attempts: details } : {}) })
    }
    const file = addressFile(address)
    const record = read<WalletRecord>(file) ?? { address, role: "USER", createdAt: new Date().toISOString() }
    delete record.nonce
    delete record.nonceExpiresAt
    write(file, record)
    const now = Date.now()
    const authToken = token({ sub: address, address, role: record.role, iat: now, exp: now + sessionTtlMs })
    ;(res as Response & { cookie?: Function }).cookie?.("verity_session", authToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: sessionTtlMs, path: "/" })
    try { fs.unlinkSync(pendingFile) } catch { /* nonce cleanup is best effort */ }
    res.json({ token: authToken, user: { address, role: record.role } })
  })

  app.post("/auth/debug-recover", (req: Request, res: Response) => {
    if (process.env.NODE_ENV === "production") return res.status(404).end()
    const message = String(req.body?.message ?? "")
    const signature = String(req.body?.signature ?? "")
    if (!message || !signature || message.length > 1024) return res.status(400).json({ error: "message and signature are required" })
    res.json({ attempts: recoverSignature(message, signature) })
  })

  app.post("/auth/login",  (req: Request, res: Response) => {
    if (!secret()) return res.status(503).json({ error: "JWT authentication is not configured" })
    const address = String(req.body?.address ?? "").toLowerCase()
    const signature = String(req.body?.signature ?? "")
    if (!ethers.isAddress(address) || !signature) return res.status(400).json({ error: "Valid address and signature are required" })
    const file = addressFile(address)
    const record = read<WalletRecord>(file)
    if (!record?.nonce || !record.nonceExpiresAt || record.nonceExpiresAt < Date.now()) return res.status(401).json({ error: "Nonce expired or not found" })
    try {
      if (ethers.verifyMessage(`Verity login nonce: ${record.nonce}`, signature).toLowerCase() !== address) return res.status(401).json({ error: "Invalid signature" })
    } catch { return res.status(401).json({ error: "Invalid signature" }) }
    delete record.nonce
    delete record.nonceExpiresAt
    write(file, record)
    const now = Date.now()
    const authToken = token({ sub: address, address, role: record.role, iat: now, exp: now + sessionTtlMs })
    ;(res as Response & { cookie?: Function }).cookie?.("verity_session", authToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: sessionTtlMs, path: "/" })
    res.json({ token: authToken, user: { address, role: record.role } })
  })

  app.post("/auth/logout", (_req: Request, res: Response) => { ;(res as Response & { clearCookie?: Function }).clearCookie?.("verity_session", { path: "/" }); res.status(204).end() })
  app.get("/auth/me", authenticateJWT, (req: AuthRequest, res: Response) => res.json({ user: req.user }))
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined
  const cookie = req.headers.cookie?.match(/(?:^|; )verity_session=([^;]+)/)?.[1]
  const user = verify(bearer ?? cookie ?? "")
  if (!user || typeof user.address !== "string") return res.status(401).json({ error: "Authentication required" })
  req.user = { address: user.address, role: user.role === "ADMIN" ? "ADMIN" : "USER" }
  next()
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") return res.status(403).json({ error: "Admin role required" })
  next()
}
