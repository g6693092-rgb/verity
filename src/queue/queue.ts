import Queue from "bull"

export type ProofJobData = {
  jobId: string
  claimId: string
}

let proofQueue: Queue.Queue<ProofJobData> | undefined

export function getProofQueue() {
  proofQueue ??= new Queue<ProofJobData>("proofs", process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  })
  return proofQueue
}
