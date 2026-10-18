import request from "supertest"
import { Wallet } from "ethers"

process.env.JWT_SECRET = "test-secret-with-at-least-32-characters"
process.env.DATA_DIR = "/tmp/verity-auth-tests"

import { app } from "../src/app"

describe("wallet authentication", () => {
  const wallet = Wallet.createRandom()
  let nonce = ""
  let token = ""

  it("issues a nonce", async () => {
    const response = await request(app).get(`/auth/nonce/${wallet.address}`).expect(200)
    nonce = response.body.nonce
    expect(nonce).toEqual(expect.any(String))
  })

  it("accepts a signed nonce and returns a session", async () => {
    const signature = await wallet.signMessage(`Verity login nonce: ${nonce}`)
    const response = await request(app).post("/auth/login").send({ address: wallet.address, signature }).expect(200)
    token = response.body.token
    expect(token).toEqual(expect.any(String))
    expect(response.body.user.address).toBe(wallet.address.toLowerCase())
  })

  it("protects the current-user endpoint", async () => {
    const response = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`).expect(200)
    expect(response.body.user.address).toBe(wallet.address.toLowerCase())
  })

  it("rejects nonce replay", async () => {
    const signature = await wallet.signMessage(`Verity login nonce: ${nonce}`)
    await request(app).post("/auth/login").send({ address: wallet.address, signature }).expect(401)
  })
})
