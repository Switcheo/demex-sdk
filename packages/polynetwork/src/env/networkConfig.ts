import { CONST } from "@cityofzion/neon-core-next";
import { Network, NetworkMap } from "@demex-sdk/core";
import { EVMChain } from "./blockchain";

export interface BasicNetworkConfig {
  rpcURL: string
};

export interface EthNetworkConfig extends BasicNetworkConfig {
  wsURL: string;
  lockProxyAddr: string;
  balanceReader: string;
};

export interface NeoNetworkConfig extends BasicNetworkConfig {
  wrapperScriptHash: string;
};

export interface N3NetworkConfig extends BasicNetworkConfig {
  networkMagic: number;
};

export interface ZilNetworkConfig extends BasicNetworkConfig {
  chainId: number;
  lockProxyAddr: string;
};

export type EVMConfig = {
  [chain in EVMChain]: EthNetworkConfig;
}

export type PolynetworkConfig = EVMConfig & {
  feeAddress: string;
  bech32Prefix: string;

  "Neo": NeoNetworkConfig;
  "Neo3": N3NetworkConfig;
  "Zilliqa": ZilNetworkConfig;
};

const EthNetworkConfigFallback: EthNetworkConfig = {
  rpcURL: "",
  wsURL: "",
  lockProxyAddr: "",
  balanceReader: "",
}

export const PolynetworkConfigs: NetworkMap<PolynetworkConfig> = {
  [Network.MainNet]: {
    feeAddress: "08d8f59e475830d9a1bb97d74285c4d34c6dac08", // swth1prv0t8j8tqcdngdmjlt59pwy6dxxmtqgycy2h7
    bech32Prefix: "swth",

    "Ethereum": {
      rpcURL: "https://eth-mainnet.alchemyapi.io/v2/RWHcfoaBKzRpXnLONcEDnVqtUp7StNYl",
      wsURL: "wss://mainnet.dagger.matic.network",
      lockProxyAddr: "0x9a016ce184a22dbf6c17daa59eb7d3140dbd1c54",
      balanceReader: "0xe5e83cdba612672785d835714af26707f98030c3",
    },

    "Binance Smart Chain": {
      rpcURL: "https://bsc-dataseed2.binance.org/",
      wsURL: "",
      lockProxyAddr: "0xb5d4f343412dc8efb6ff599d790074d0f1e8d430",
      balanceReader: "0x2b18c5e1edaa7e27d40fec8d0b7d96c5eefa35df",
    },

    "Arbitrum": {
      rpcURL: "https://arb1.arbitrum.io/rpc",
      wsURL: "",
      lockProxyAddr: "0xb1e6f8820826491fcc5519f84ff4e2bdbb6e3cad",
      balanceReader: "0x7e8d8c98a016877cb3103e837fc71d41b155af70",
    },

    "Polygon": {
      rpcURL: "https://polygon-rpc.com",
      wsURL: "",
      lockProxyAddr: "0x43138036d1283413035B8eca403559737E8f7980",
      balanceReader: "0x7F31D17944a3147C31C3b55B71ebDcC57B6aCC84",
    },

    "OKC": {
      rpcURL: "https://exchainrpc.okex.org",
      wsURL: "",
      lockProxyAddr: "0xb1e6f8820826491fcc5519f84ff4e2bdbb6e3cad",
      balanceReader: "0x43138036d1283413035B8eca403559737E8f7980",
    },

    "Neo": {
      rpcURL: "https://mainnet2.neo2.coz.io:443",
      wrapperScriptHash: "f46719e2d16bf50cddcef9d4bbfece901f73cbb6",
    },

    "Neo3": {
      rpcURL: "https://n3-rpc.dem.exchange",
      networkMagic: CONST.MAGIC_NUMBER.MainNet,
    },

    "Zilliqa": {
      rpcURL: "https://api.zilliqa.com",
      lockProxyAddr: "0xd73c6b871b4d0e130d64581993b745fc938a5be7",
      chainId: 1,
    },

    "Mantle": {
      ...EthNetworkConfigFallback,
      rpcURL: "https://rpc.mantle.xyz",
    },

    "OP": {
      ...EthNetworkConfigFallback,
      rpcURL: "https://mainnet.optimism.io",
    },

    "Base": {
      ...EthNetworkConfigFallback,
      rpcURL: "https://base-rpc.publicnode.com",
    },
  },

  [Network.TestNet]: {
    feeAddress: "989761fb0c0eb0c05605e849cae77d239f98ac7f", // swth1nztkr7cvp6cvq4s9apyu4emayw0e3trl9ezyzs
    bech32Prefix: "tswth",

    "Ethereum": {
      rpcURL: "https://eth-goerli.g.alchemy.com/v2/OTTRiEhTje49mmrrm4WbuPbZmuZMivEu",
      wsURL: "",
      lockProxyAddr: "0xa06569e48fed18ed840c3f064ffd9bbf95debce7",
      balanceReader: "0xf6fBa7Bbc806F55dA52af17203d84C61FfFa18c2",
    },

    "Binance Smart Chain": {
      rpcURL: "https://data-seed-prebsc-1-s2.binance.org:8545/",
      wsURL: "",
      lockProxyAddr: "0x7c2b13d656d222cb79670e301dd826dc5b8dc20c",
      balanceReader: "0x25c22f65cb820e787a13951f295d0b86db7b07b5",
    },

    "Arbitrum": {
      rpcURL: "https://rinkeby.arbitrum.io/rpc",
      wsURL: "",
      lockProxyAddr: "",
      balanceReader: "",
    },

    "Polygon": {
      rpcURL: "https://rpc-mumbai.maticvigil.com",
      wsURL: "",
      lockProxyAddr: "",
      balanceReader: "",
    },

    "OKC": {
      rpcURL: "https://exchaintestrpc.okex.org",
      wsURL: "",
      lockProxyAddr: "",
      balanceReader: "",
    },

    "Neo": {
      rpcURL: "https://g30trj885e.execute-api.ap-southeast-1.amazonaws.com",
      wrapperScriptHash: "f46719e2d16bf50cddcef9d4bbfece901f73cbb6",
    },

    "Neo3": {
      rpcURL: "https://test-n3-rpc.dem.exchange",
      networkMagic: CONST.MAGIC_NUMBER.TestNet,
    },

    "Zilliqa": {
      rpcURL: "https://dev-api.zilliqa.com",
      lockProxyAddr: "0xe7bef341044f1b8d5ab1a25172e2678a1e75479a",
      chainId: 111,
    },

    "Mantle": {
      ...EthNetworkConfigFallback,
      rpcURL: "https://rpc.sepolia.mantle.xyz",
    },

    "OP": {
      ...EthNetworkConfigFallback,
      rpcURL: "https://sepolia.optimism.io",
    },

    "Base": {
      ...EthNetworkConfigFallback,
      rpcURL: "https://base-sepolia-rpc.publicnode.com",
    },
  },

  [Network.DevNet]: {
    feeAddress: "989761fb0c0eb0c05605e849cae77d239f98ac7f", // swth1nztkr7cvp6cvq4s9apyu4emayw0e3trl9ezyzs
    bech32Prefix: "swth",

    "Ethereum": {
      rpcURL: "https://eth-goerli.g.alchemy.com/v2/OTTRiEhTje49mmrrm4WbuPbZmuZMivEu",
      wsURL: "",
      lockProxyAddr: "0x7f7317167e90afa38972e46b031bb4da0b1f6f73",
      balanceReader: "0xf6fBa7Bbc806F55dA52af17203d84C61FfFa18c2",
    },

    "Binance Smart Chain": {
      rpcURL: "https://data-seed-prebsc-1-s2.binance.org:8545/",
      wsURL: "",
      lockProxyAddr: "0x7c2b13d656d222cb79670e301dd826dc5b8dc20c",
      balanceReader: "0x25c22f65cb820e787a13951f295d0b86db7b07b5",
    },

    "Arbitrum": {
      rpcURL: "https://rinkeby.arbitrum.io/rpc",
      wsURL: "",
      lockProxyAddr: "",
      balanceReader: "",
    },

    "Polygon": {
      rpcURL: "https://rpc-mumbai.maticvigil.com",
      wsURL: "",
      lockProxyAddr: "",
      balanceReader: "",
    },

    "OKC": {
      rpcURL: "https://exchaintestrpc.okex.org",
      wsURL: "",
      lockProxyAddr: "",
      balanceReader: "",
    },


    "Neo": {
      rpcURL: "https://g30trj885e.execute-api.ap-southeast-1.amazonaws.com",
      wrapperScriptHash: "f46719e2d16bf50cddcef9d4bbfece901f73cbb6",
    },

    "Neo3": {
      rpcURL: "https://test-n3-rpc.dem.exchange",
      networkMagic: CONST.MAGIC_NUMBER.TestNet,
    },

    "Zilliqa": {
      rpcURL: "https://dev-api.zilliqa.com",
      lockProxyAddr: "0xa5a43eecd29534edf80792a9889f52c77455245d",
      chainId: 333,
    },

    "Mantle": {
      ...EthNetworkConfigFallback,
      rpcURL: "https://rpc.sepolia.mantle.xyz",
    },

    "OP": {
      ...EthNetworkConfigFallback,
      rpcURL: "https://sepolia.optimism.io",
    },

    "Base": {
      ...EthNetworkConfigFallback,
      rpcURL: "https://base-sepolia-rpc.publicnode.com",
    },
  },

  [Network.Local]: {
    feeAddress: "989761fb0c0eb0c05605e849cae77d239f98ac7f",
    bech32Prefix: "tswth",

    "Ethereum": {
      rpcURL: "https://eth-goerli.g.alchemy.com/v2/OTTRiEhTje49mmrrm4WbuPbZmuZMivEu",
      wsURL: "wss://ropsten.dagger.matic.network",
      lockProxyAddr: "",
      balanceReader: "",
    },

    "Binance Smart Chain": {
      rpcURL: "https://data-seed-prebsc-1-s2.binance.org:8545/",
      wsURL: "",
      lockProxyAddr: "",
      balanceReader: "",
    },

    "Arbitrum": {
      rpcURL: "https://rinkeby.arbitrum.io/rpc",
      wsURL: "",
      lockProxyAddr: "",
      balanceReader: "",
    },

    "Polygon": {
      rpcURL: "https://rpc-mumbai.maticvigil.com",
      wsURL: "",
      lockProxyAddr: "",
      balanceReader: "",
    },

    "OKC": {
      rpcURL: "https://exchaintestrpc.okex.org",
      wsURL: "",
      lockProxyAddr: "",
      balanceReader: "",
    },


    "Neo": {
      rpcURL: "https://g30trj885e.execute-api.ap-southeast-1.amazonaws.com",
      wrapperScriptHash: "f46719e2d16bf50cddcef9d4bbfece901f73cbb6",
    },

    "Neo3": {
      rpcURL: "https://test-n3-rpc.dem.exchange",
      networkMagic: CONST.MAGIC_NUMBER.TestNet,
    },

    "Zilliqa": {
      rpcURL: "",
      lockProxyAddr: "",
      chainId: 1,
    },

    "Mantle": {
      ...EthNetworkConfigFallback,
      rpcURL: "https://rpc.sepolia.mantle.xyz",
    },

    "OP": {
      ...EthNetworkConfigFallback,
      rpcURL: "https://sepolia.optimism.io",
    },

    "Base": {
      ...EthNetworkConfigFallback,
      rpcURL: "https://base-sepolia-rpc.publicnode.com",
    },
  },
} as const;