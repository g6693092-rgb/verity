declare module "circomlibjs" {
  type Poseidon = ((inputs: bigint[]) => bigint) & { F: { toString(value: bigint): string } }
  const buildPoseidon: () => Promise<Poseidon>
  export default buildPoseidon
}

declare module "snarkjs" {
  export const groth16: {
    verify(vk: unknown, publicSignals: unknown, proof: unknown): Promise<boolean>
  }
  const snarkjs: { groth16: typeof groth16 }
  export default snarkjs
}
