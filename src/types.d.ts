declare module "circomlibjs" {
  type Poseidon = ((inputs: bigint[]) => bigint) & { F: { toString(value: bigint): string } }
  const buildPoseidon: () => Promise<Poseidon>
  export default buildPoseidon
}
