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

  bech32Prefix: string;
}

export interface NetworkMap<T> {
  [Network.MainNet]: T;
  [Network.TestNet]: T;
  [Network.DevNet]: T;
  [Network.Local]: T;
};

export const CarbonChainIDs: NetworkMap<string> = {
  [Network.MainNet]: "carbon-1",
  [Network.TestNet]: "carbon-testnet-42070",
  [Network.DevNet]: "carbon-devnet-39911",
  [Network.Local]: "carbon-localhost",
} as const;

export const CarbonEVMChainIDs: NetworkMap<string> = {
  [Network.MainNet]: "carbon_9790-1",
  [Network.TestNet]: "carbon_9792-1",
  [Network.DevNet]: "carbon_9791-1",
  [Network.Local]: "carbon_9999-1",
} as const;

export const defaultNetworkConfig: Record<Network, NetworkConfig> = {
  [Network.MainNet]: {
    network: Network.MainNet,
    chainId: CarbonChainIDs[Network.MainNet],
    evmChainId: CarbonEVMChainIDs[Network.MainNet],

    tmRpcUrl: "https://tm-api.carbon.network",
    restUrl: "https://api.carbon.network",
    grpcUrl: "grpc.carbon.network",
    wsUrl: "wss://ws-api.carbon.network/ws",

    bech32Prefix: "swth",
  },
  [Network.TestNet]: {
    network: Network.TestNet,
    chainId: CarbonChainIDs[Network.TestNet],
    evmChainId: CarbonEVMChainIDs[Network.TestNet],

    tmRpcUrl: "https://test-tm-api.carbon.network",
    restUrl: "https://test-api.carbon.network",
    grpcUrl: "test-grpc.carbon.network",
    wsUrl: "wss://test-ws-api.carbon.network/ws",

    bech32Prefix: "tswth",
  },
  [Network.DevNet]: {
    network: Network.DevNet,
    chainId: CarbonChainIDs[Network.DevNet],
    evmChainId: CarbonEVMChainIDs[Network.DevNet],

    tmRpcUrl: "https://dev-tm-api.carbon.network",
    restUrl: "https://dev-api.carbon.network",
    grpcUrl: "dev-grpc.carbon.network",
    wsUrl: "wss://dev-ws-api.carbon.network/ws",

    bech32Prefix: "swth",
  },
  [Network.Local]: {
    network: Network.Local,
    chainId: CarbonChainIDs[Network.Local],
    evmChainId: CarbonEVMChainIDs[Network.Local],

    tmRpcUrl: "http://localhost:26657",
    restUrl: "http://localhost:1317",
    grpcUrl: "localhost:9090",
    wsUrl: "ws://localhost:5001",

    bech32Prefix: "tswth",
  },
};

export const evmChainIds: Record<string, string> = Object.values(defaultNetworkConfig).reduce(
  (acc, { chainId, evmChainId }) => ({
    ...acc,
    [chainId]: evmChainId,
  }),
  {}
);