import "dotenv/config"
import fs from "node:fs"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { getProofQueue } from "./queue"

const run = promisify(execFile)
const dataDir = path.resolve(process.env.DATA_DIR ?? "data")
const sampleDir = path.resolve("sample")
const proofDir = path.resolve("proofs")
const jobsDir = path.join(dataDir, "jobs")

for (const dir of [dataDir, sampleDir, proofDir, jobsDir]) fs.mkdirSync(dir, { recursive: true })
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"))
const writeJob = (jobId: string, value: unknown) => fs.writeFileSync(path.join(jobsDir, `${jobId}.json`), JSON.stringify(value, null, 2))

getProofQueue().process(1, async (job) => {
  const { jobId, claimId } = job.data
  writeJob(jobId, { jobId, claimId, status: "running", startedAt: new Date().toISOString() })

  try {
    const claimPath = path.join(dataDir, `${claimId}.json`)
    if (!fs.existsSync(claimPath)) throw new Error("Claim not found")
    const claim = readJson(claimPath)
    const values = (Array.isArray(claim.temperatureSamples) ? claim.temperatureSamples : [])
      .slice(0, 16).map((value: unknown) => Math.round(Number(value)))
    const sampleCount = values.length
    while (values.length < 16) values.push(0)
    fs.writeFileSync(path.join(sampleDir, "input-cold-chain.json"), JSON.stringify({
      samples: values,
      threshold: Math.round(Number(claim.transportCheck?.maxTemp ?? 40)),
      sampleCount,
    }, null, 2))

    await run("bash", [path.resolve("scripts/run-cold-chain-proof.sh")], { cwd: process.cwd(), env: process.env })
    const proof = readJson(path.join(proofDir, "proof.json"))
    const publicSignals = readJson(path.join(proofDir, "public.json"))
    const vk = readJson(path.join(proofDir, "verification_key.json"))
    const result = { jobId, claimId, status: "completed", proof, publicSignals, vk, completedAt: new Date().toISOString() }
    writeJob(jobId, result)
    return result
  } catch (error) {
    const result = { jobId, claimId, status: "failed", error: String(error), failedAt: new Date().toISOString() }
    writeJob(jobId, result)
    throw error
  }
})

console.log("Proof worker listening on the proofs queue")
