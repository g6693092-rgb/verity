import http from "node:http"
import pino from "pino"
import app from "./app"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })
const port = Number(process.env.PORT ?? 3000)
const server = http.createServer(app)

server.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Verity backend listening")
})

const shutdown = (signal: string) => {
  logger.info({ signal }, "Shutting down Verity backend")
  server.close(error => {
    if (error) {
      logger.error({ error }, "HTTP server close failed")
      process.exitCode = 1
    }
    process.exit()
  })
  setTimeout(() => {
    logger.error("Forced shutdown after timeout")
    process.exit(1)
  }, 30_000).unref()
}

process.once("SIGINT", () => shutdown("SIGINT"))
process.once("SIGTERM", () => shutdown("SIGTERM"))
