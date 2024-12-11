export enum Network {
  MainNet = "mainnet",
  TestNet = "testnet",
  DevNet = "devnet",
  Local = "local",
}

export interface NetworkConfig {
  network: Network;
  chainId: string;

  tmRpcUrl: string;
  restUrl: string;
  grpcUrl: string;
  hydrogenUrl: string;

  bech32Prefix: string;
}

export const CarbonChainIDs = {
  [Network.MainNet]: "carbon-1",
  [Network.TestNet]: "carbon-testnet-42070",
  [Network.DevNet]: "carbon-devnet-39911",
  [Network.Local]: "carbon-localhost",
} as const;

export const defaultNetworkConfig: Record<Network, NetworkConfig> = {
  [Network.MainNet]: {
    network: Network.MainNet,
    chainId: CarbonChainIDs[Network.MainNet],

    tmRpcUrl: "https://tm-api.carbon.network",
    restUrl: "https://api.carbon.network",
    grpcUrl: "grpc.carbon.network",
    hydrogenUrl: "https://hydrogen-api.carbon.network",

    bech32Prefix: "swth",
  },
  [Network.TestNet]: {
    network: Network.TestNet,
    chainId: CarbonChainIDs[Network.TestNet],

    tmRpcUrl: "https://test-tm-api.carbon.network",
    restUrl: "https://test-api.carbon.network",
    grpcUrl: "test-grpc.carbon.network",
    hydrogenUrl: "https://test-hydrogen-api.carbon.network",

    bech32Prefix: "tswth",
  },
  [Network.DevNet]: {
    network: Network.DevNet,
    chainId: CarbonChainIDs[Network.DevNet],

    tmRpcUrl: "https://dev-tm-api.carbon.network",
    restUrl: "https://dev-api.carbon.network",
    grpcUrl: "dev-grpc.carbon.network",
    hydrogenUrl: "https://dev-hydrogen-api.carbon.network",

    bech32Prefix: "swth",
  },
  [Network.Local]: {
    network: Network.Local,
    chainId: CarbonChainIDs[Network.Local],

    tmRpcUrl: "http://localhost:26657",
    restUrl: "http://localhost:1317",
    grpcUrl: "localhost:9090",
    hydrogenUrl: "",

    bech32Prefix: "tswth",
  },
};