import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import request from "supertest"

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "verity-test-"))
process.env.DATA_DIR = dataDir

import app from "../src/app"

afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }))

test("creates a claim, batches it, and returns inclusion proof", async () => {
  const claim = { claimId: "test-claim", product: "vaccines", temperatureSamples: [2, 4] }
  const created = await request(app).post("/claims").send(claim).expect(201)
  expect(created.body.id).toBe("test-claim")

  const batch = await request(app).post("/batch").expect(201)
  expect(batch.body.batch.root).toMatch(/^0x[0-9a-f]{64}$/)

  const inclusion = await request(app).post("/batch/inclusion").send({ batchId: batch.body.batch.id, claimId: "test-claim" }).expect(200)
  expect(inclusion.body.root).toBe(batch.body.batch.root)
  expect(inclusion.body.leaf).toMatch(/^0x[0-9a-f]{64}$/)
})
