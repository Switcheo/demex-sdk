enum Network {
  MainNet = "mainnet",
  TestNet = "testnet",
  DevNet = "devnet",
  Local = "local",
}
namespace Network {
  export function parse(input: unknown) {
    // check if not match + not string
    if (Object.values(Network).includes(input as Network)) return input as Network
    if (typeof input !== "string") return null;

    // input is string
    switch (input) {
      case "mainnet":
      case "main": return Network.MainNet;
      case "testnet":
      case "test": return Network.TestNet;
      case "devnet":
      case "devn": return Network.DevNet;
      case "localhost":
      case "local": return Network.Local;
      default: return null;
    }
  }
}

export { Network };

export interface NetworkConfig {
  network: Network
  chainId: string
  evmChainId: string

  tmRpcUrl: string
  tmWsUrl: string
  restUrl: string
  grpcUrl: string
  evmRpcUrl: string
  wsUrl: string

  insightsUrl: string
  hydrogenUrl: string
  faucetUrl?: string

  bech32Prefix: string
}

export const defaultNetworkConfig: Record<Network, NetworkConfig> = {
  [Network.MainNet]: {
    network: Network.MainNet,
    chainId: "carbon-1",
    evmChainId: "carbon_9790-1",

    tmRpcUrl: "https://tm-api.carbon.network",
    tmWsUrl: "wss://tm-api.carbon.network/",
    restUrl: "https://api.carbon.network",
    grpcUrl: "grpc.carbon.network",
    evmRpcUrl: "https://evm-api.carbon.network",
    wsUrl: "wss://ws-api.carbon.network/ws",

    insightsUrl: "https://api-insights.carbon.network",
    hydrogenUrl: "https://hydrogen-api.carbon.network",

    bech32Prefix: "swth",
  },
  [Network.TestNet]: {
    network: Network.TestNet,
    chainId: "carbon-testnet-42070",
    evmChainId: "carbon_9792-1",
    tmRpcUrl: "https://test-tm-api.carbon.network",
    tmWsUrl: "wss://test-tm-api.carbon.network/",
    restUrl: "https://test-api.carbon.network",
    grpcUrl: "test-grpc.carbon.network",
    evmRpcUrl: "https://test-evm-api.carbon.network/",
    wsUrl: "wss://test-ws-api.carbon.network/ws",

    insightsUrl: "https://test-api-insights.carbon.network",
    hydrogenUrl: "https://test-hydrogen-api.carbon.network",
    faucetUrl: "https://test-faucet.carbon.network",

    bech32Prefix: "tswth",
  },
  [Network.DevNet]: {
    network: Network.DevNet,
    chainId: "carbon-devnet-39911",
    evmChainId: "carbon_9791-1",
    tmRpcUrl: "https://dev-tm-api.carbon.network",
    tmWsUrl: "wss://dev-tm-api.carbon.network/",
    restUrl: "https://dev-api.carbon.network",
    grpcUrl: "dev-grpc.carbon.network",
    evmRpcUrl: "https://dev-evm-api.carbon.network/",
    wsUrl: "wss://dev-ws-api.carbon.network/ws",

    insightsUrl: "https://test-api-insights.carbon.network",
    hydrogenUrl: "https://dev-hydrogen-api.carbon.network",
    faucetUrl: "https://dev-faucet.carbon.network",

    bech32Prefix: "swth",
  },
  [Network.Local]: {
    network: Network.Local,
    chainId: "carbon-localhost",
    evmChainId: "carbon_9999-1",
    tmRpcUrl: "http://localhost:26657",
    tmWsUrl: "ws://localhost:26657",
    restUrl: "http://localhost:1317",
    grpcUrl: "localhost:9090",
    evmRpcUrl: "http://localhost:8545",
    wsUrl: "ws://localhost:5001",

    insightsUrl: "http://localhost:8181",
    hydrogenUrl: "https://hydrogen-api.carbon.network",
    faucetUrl: "http://localhost:4500",

    bech32Prefix: "tswth",
  },
}

export const evmChainIds: Record<string, string> = Object.values(defaultNetworkConfig).reduce(
  (acc, { chainId, evmChainId }) => ({
    ...acc,
    [chainId]: evmChainId,
  }),
  {}
);


export const overrideConfig = (network: Network, networkConfig: Partial<NetworkConfig> = {}) => {
  return {
    ...defaultNetworkConfig[network],
    ...networkConfig,
    network,
  }
}
