import Queue from "bull"

export type ProofJobData = {
  jobId: string
  claimId: string
}

let proofQueue: Queue.Queue<ProofJobData> | undefined

export function getProofQueue() {
  proofQueue ??= new Queue<ProofJobData>("proofs", process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    defaultJobOptions: {
      attempts: Number(process.env.PROOF_JOB_ATTEMPTS ?? 3),
      backoff: { type: "exponential", delay: Number(process.env.PROOF_JOB_BACKOFF_MS ?? 2000) },
      timeout: Number(process.env.PROOF_JOB_TIMEOUT_MS ?? 600000),
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    },
  })
  return proofQueue
}
