export enum Network {
  MainNet = "mainnet",
  TestNet = "testnet",
  DevNet = "devnet",
  Local = "local",
}

export interface NetworkConfig {
  network: Network
  chainId: string
  evmChainId: string

  tmRpcUrl: string
  restUrl: string
  grpcUrl: string
  wsUrl: string

  bech32Prefix: string
}

export const defaultNetworkConfig: Record<Network, NetworkConfig> = {
  [Network.MainNet]: {
    network: Network.MainNet,
    chainId: "carbon-1",
    evmChainId: "carbon_9790-1",
    tmRpcUrl: "https://tm-api.carbon.network",
    restUrl: "https://api.carbon.network",
    grpcUrl: "grpc.carbon.network",
    wsUrl: "wss://ws-api.carbon.network/ws",

    bech32Prefix: "swth",
  },
  [Network.TestNet]: {
    network: Network.TestNet,
    chainId: "carbon-testnet-42070",
    evmChainId: "carbon_9792-1",
    tmRpcUrl: "https://test-tm-api.carbon.network",
    restUrl: "https://test-api.carbon.network",
    grpcUrl: "test-grpc.carbon.network",
    wsUrl: "wss://test-ws-api.carbon.network/ws",

    bech32Prefix: "tswth",
  },
  [Network.DevNet]: {
    network: Network.DevNet,
    chainId: "carbon-devnet-39911",
    evmChainId: "carbon_9791-1",
    tmRpcUrl: "https://dev-tm-api.carbon.network",
    restUrl: "https://dev-api.carbon.network",
    grpcUrl: "dev-grpc.carbon.network",
    wsUrl: "wss://dev-ws-api.carbon.network/ws",

    bech32Prefix: "swth",
  },
  [Network.Local]: {
    network: Network.Local,
    chainId: "carbon-localhost",
    evmChainId: "carbon_9999-1",
    tmRpcUrl: "http://localhost:26657",
    restUrl: "http://localhost:1317",
    grpcUrl: "localhost:9090",
    wsUrl: "ws://localhost:5001",

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
