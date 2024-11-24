export interface BasicNetworkConfig {
  rpcURL: string
};

export interface EthNetworkConfig extends BasicNetworkConfig {
  wsURL: string;
  payerURL: string;
  lockProxyAddr: string;
  bridgeEntranceAddr: string;
  balanceReader: string;
  byteCodeHash: string;
};

export interface NeoNetworkConfig extends BasicNetworkConfig {
  wrapperScriptHash: string;
};

export interface ZilNetworkConfig extends BasicNetworkConfig {
  chainId: number;
  lockProxyAddr: string;
  bridgeEntranceAddr: string;
};