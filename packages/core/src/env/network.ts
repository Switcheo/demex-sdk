export enum Network {
  MainNet = "mainnet",
  TestNet = "testnet",
  DevNet = "devnet",
  Local = "local",
}

export interface NetworkConfig {
  network: Network
  chainId: string

  tmRpcUrl: string
  restUrl: string
  grpcUrl: string

  bech32Prefix: string
}

export const defaultNetworkConfig: Record<Network, NetworkConfig> = {
  [Network.MainNet]: {
    network: Network.MainNet,
    chainId: "carbon-1",

    tmRpcUrl: "https://tm-api.carbon.network",
    restUrl: "https://api.carbon.network",
    grpcUrl: "grpc.carbon.network",

    bech32Prefix: "swth",
  },
  [Network.TestNet]: {
    network: Network.TestNet,
    chainId: "carbon-1",
    tmRpcUrl: "https://test-tm-api.carbon.network",
    restUrl: "https://test-api.carbon.network",
    grpcUrl: "test-grpc.carbon.network",

    bech32Prefix: "tswth",
  },
  [Network.DevNet]: {
    network: Network.DevNet,
    chainId: "carbon-1",
    tmRpcUrl: "https://dev-tm-api.carbon.network",
    restUrl: "https://dev-api.carbon.network",
    grpcUrl: "dev-grpc.carbon.network",

    bech32Prefix: "swth",
  },
  [Network.Local]: {
    network: Network.Local,
    chainId: "carbon-1",
    tmRpcUrl: "http://localhost:26657",
    restUrl: "http://localhost:1317",
    grpcUrl: "localhost:9090",

    bech32Prefix: "tswth",
  },
}
