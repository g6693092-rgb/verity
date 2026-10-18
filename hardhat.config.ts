import type { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "dotenv/config";

const normalizePrivateKey = (value: string | undefined) => {
  const key = value?.trim().replace(/^0x/, "")
  return key && /^[0-9a-fA-F]{64}$/.test(key) ? `0x${key}` : undefined
}

const testnetKey = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY_TESTNET ?? process.env.DEPLOYER_PRIVATE_KEY)
const mainnetKey = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY_MAINNET ?? process.env.DEPLOYER_PRIVATE_KEY)

const config: HardhatUserConfig = {
  solidity: { version: "0.8.17", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    hardhat: { type: "edr-simulated" },
    vechainTestnet: {
      type: "http",
      url: process.env.VECHAIN_TESTNET_RPC ?? "https://rpc-testnet.vechain.energy",
      chainId: 100010,
      accounts: testnetKey ? [testnetKey] : [],
    },
    vechainMainnet: {
      type: "http",
      url: process.env.VECHAIN_MAINNET_RPC ?? "https://rpc-mainnet.vechain.energy",
      chainId: 100009,
      accounts: mainnetKey ? [mainnetKey] : [],
    },
  },
};

export default config;
