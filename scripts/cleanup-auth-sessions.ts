import fs from "node:fs"
import path from "node:path"

const authDir = path.resolve(process.env.DATA_DIR ?? "data", "auth")
const maxAgeMs = Number(process.env.AUTH_SESSION_CLEANUP_MS ?? 24 * 60 * 60 * 1000)
const cutoff = Date.now() - maxAgeMs

if (!fs.existsSync(authDir)) process.exit(0)
for (const entry of fs.readdirSync(authDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".json")) continue
  const file = path.join(authDir, entry.name)
  const stat = fs.statSync(file)
  if (stat.mtimeMs < cutoff) fs.rmSync(file)
}
