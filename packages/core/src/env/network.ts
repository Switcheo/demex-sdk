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

  feeAddress: string;

  bech32Prefix: string
}

export const defaultNetworkConfig: Record<Network, NetworkConfig> = {
  [Network.MainNet]: {
    network: Network.MainNet,
    chainId: "carbon-1",

    tmRpcUrl: "https://tm-api.carbon.network",
    restUrl: "https://api.carbon.network",
    grpcUrl: "grpc.carbon.network",

    feeAddress: "08d8f59e475830d9a1bb97d74285c4d34c6dac08", // swth1prv0t8j8tqcdngdmjlt59pwy6dxxmtqgycy2h7

    bech32Prefix: "swth",
  },
  [Network.TestNet]: {
    network: Network.TestNet,
    chainId: "carbon-1",

    tmRpcUrl: "https://test-tm-api.carbon.network",
    restUrl: "https://test-api.carbon.network",
    grpcUrl: "test-grpc.carbon.network",

    feeAddress: "989761fb0c0eb0c05605e849cae77d239f98ac7f", // swth1nztkr7cvp6cvq4s9apyu4emayw0e3trl9ezyzs

    bech32Prefix: "tswth",
  },
  [Network.DevNet]: {
    network: Network.DevNet,
    chainId: "carbon-1",

    tmRpcUrl: "https://dev-tm-api.carbon.network",
    restUrl: "https://dev-api.carbon.network",
    grpcUrl: "dev-grpc.carbon.network",

    feeAddress: "989761fb0c0eb0c05605e849cae77d239f98ac7f", // swth1nztkr7cvp6cvq4s9apyu4emayw0e3trl9ezyzs

    bech32Prefix: "swth",
  },
  [Network.Local]: {
    network: Network.Local,
    chainId: "carbon-1",
    tmRpcUrl: "http://localhost:26657",
    restUrl: "http://localhost:1317",
    grpcUrl: "localhost:9090",

    feeAddress: "989761fb0c0eb0c05605e849cae77d239f98ac7f",

    bech32Prefix: "tswth",
  },
}
