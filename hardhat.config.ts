import type { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "dotenv/config";

const testnetKey = process.env.DEPLOYER_PRIVATE_KEY_TESTNET ?? process.env.DEPLOYER_PRIVATE_KEY;
const mainnetKey = process.env.DEPLOYER_PRIVATE_KEY_MAINNET ?? process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: { version: "0.8.17", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    hardhat: {},
    vechainTestnet: {
      url: process.env.VECHAIN_TESTNET_RPC ?? "https://rpc-testnet.vechain.energy",
      chainId: 100010,
      accounts: testnetKey ? [testnetKey] : [],
    },
    vechainMainnet: {
      url: process.env.VECHAIN_MAINNET_RPC ?? "https://rpc-mainnet.vechain.energy",
      chainId: 100009,
      accounts: mainnetKey ? [mainnetKey] : [],
    },
  },
};

export default config;
