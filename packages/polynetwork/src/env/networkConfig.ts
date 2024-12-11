import { CONST } from "@cityofzion/neon-core-next";
import { Network } from "@demex-sdk/core";
import { EVMChain } from "./blockchain";

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

export interface N3NetworkConfig extends BasicNetworkConfig {
  networkMagic: number;
};

export interface ZilNetworkConfig extends BasicNetworkConfig {
  chainId: number;
  lockProxyAddr: string;
  bridgeEntranceAddr: string;
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
  payerURL: "",
  bridgeEntranceAddr: "",
  lockProxyAddr: "",
  balanceReader: "",
  byteCodeHash: "",
}

export const PolynetworkConfigs: {
  [key in Network]: PolynetworkConfig;
} = {
  [Network.MainNet]: {
    feeAddress: "08d8f59e475830d9a1bb97d74285c4d34c6dac08", // swth1prv0t8j8tqcdngdmjlt59pwy6dxxmtqgycy2h7
    bech32Prefix: "swth",

    "Ethereum": {
      rpcURL: "https://eth-mainnet.alchemyapi.io/v2/RWHcfoaBKzRpXnLONcEDnVqtUp7StNYl",
      wsURL: "wss://mainnet.dagger.matic.network",
      payerURL: "https://payer.carbon.network",
      bridgeEntranceAddr: "0x93fd29ff3b662c9e5e15681bb3b139d6ce2ca9c5",
      lockProxyAddr: "0x9a016ce184a22dbf6c17daa59eb7d3140dbd1c54",
      balanceReader: "0xe5e83cdba612672785d835714af26707f98030c3",
      byteCodeHash: "0xc77e5709a69e94d310a6dfb700801758c4caed0385b25bdf82bbdf954e4dd0c3",
    },

    "Binance Smart Chain": {
      rpcURL: "https://bsc-dataseed2.binance.org/",
      wsURL: "",
      payerURL: "https://payer.carbon.network",
      bridgeEntranceAddr: "0x93fd29ff3b662c9e5e15681bb3b139d6ce2ca9c5",
      lockProxyAddr: "0xb5d4f343412dc8efb6ff599d790074d0f1e8d430",
      balanceReader: "0x2b18c5e1edaa7e27d40fec8d0b7d96c5eefa35df",
      byteCodeHash: "0x1b147c1cef546fcbcc1284df778073d65b90f80d5b649a69d5f8a01e186c0ec1",
    },

    "Arbitrum": {
      rpcURL: "https://arb1.arbitrum.io/rpc",
      wsURL: "",
      payerURL: "https://payer.carbon.network",
      bridgeEntranceAddr: "0x7b1c7216c117cc62d875e3086518b238392cf04d",
      lockProxyAddr: "0xb1e6f8820826491fcc5519f84ff4e2bdbb6e3cad",
      balanceReader: "0x7e8d8c98a016877cb3103e837fc71d41b155af70",
      byteCodeHash: "", // TODO: update when byteCodeHash is added
    },

    "Polygon": {
      rpcURL: "https://polygon-rpc.com",
      wsURL: "",
      payerURL: "https://payer.carbon.network",
      bridgeEntranceAddr: "0x75d302266926CB34B7564AAF3102c258234A35F2",
      lockProxyAddr: "0x43138036d1283413035B8eca403559737E8f7980",
      balanceReader: "0x7F31D17944a3147C31C3b55B71ebDcC57B6aCC84",
      byteCodeHash: "", // TODO: update when byteCodeHash is added
    },

    "OKC": {
      rpcURL: "https://exchainrpc.okex.org",
      wsURL: "",
      payerURL: "https://payer.carbon.network",
      bridgeEntranceAddr: "0x7b1c7216c117cc62d875e3086518b238392cf04d",
      lockProxyAddr: "0xb1e6f8820826491fcc5519f84ff4e2bdbb6e3cad",
      balanceReader: "0x43138036d1283413035B8eca403559737E8f7980",
      byteCodeHash: "", // TODO: update when byteCodeHash is added
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
      bridgeEntranceAddr: "0x5d78b51a1ceae202a793f4e87478253f41a22956",
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
      payerURL: `https://dev-payer.carbon.network`,
      lockProxyAddr: "0xa06569e48fed18ed840c3f064ffd9bbf95debce7",
      bridgeEntranceAddr: "0x23D969345788bE24e5110F4c5D7B978DacDe8B1C",
      balanceReader: "0xf6fBa7Bbc806F55dA52af17203d84C61FfFa18c2",
      byteCodeHash: "0xeb1f732f12a0448d8692018a6d6d381cc7afc84d7e0729007931d966c0c9dc6d",
    },

    "Binance Smart Chain": {
      rpcURL: "https://data-seed-prebsc-1-s2.binance.org:8545/",
      wsURL: "",
      payerURL: `https://test-payer.carbon.network`,
      bridgeEntranceAddr: "",
      lockProxyAddr: "0x7c2b13d656d222cb79670e301dd826dc5b8dc20c",
      balanceReader: "0x25c22f65cb820e787a13951f295d0b86db7b07b5",
      byteCodeHash: "0x1b147c1cef546fcbcc1284df778073d65b90f80d5b649a69d5f8a01e186c0ec1",
    },

    "Arbitrum": {
      rpcURL: "https://rinkeby.arbitrum.io/rpc",
      wsURL: "",
      payerURL: "https://test-payer.carbon.network",
      bridgeEntranceAddr: "",
      lockProxyAddr: "",
      balanceReader: "",
      byteCodeHash: "",
    },

    "Polygon": {
      rpcURL: "https://rpc-mumbai.maticvigil.com",
      wsURL: "",
      payerURL: "https://test-payer.carbon.network",
      bridgeEntranceAddr: "",
      lockProxyAddr: "",
      balanceReader: "",
      byteCodeHash: "",
    },

    "OKC": {
      rpcURL: "https://exchaintestrpc.okex.org",
      wsURL: "",
      payerURL: "https://test-payer.carbon.network",
      bridgeEntranceAddr: "",
      lockProxyAddr: "",
      balanceReader: "",
      byteCodeHash: "",
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
      bridgeEntranceAddr: "0xccf798e633d6fb6505b494fc010903f9be3bc99b",
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
      payerURL: `https://dev-payer.carbon.network`,
      lockProxyAddr: "0x7f7317167e90afa38972e46b031bb4da0b1f6f73",
      bridgeEntranceAddr: "0xd942ba20a58543878335108aac8c811f1f92fa33",
      balanceReader: "0xf6fBa7Bbc806F55dA52af17203d84C61FfFa18c2",
      byteCodeHash: "0xeb1f732f12a0448d8692018a6d6d381cc7afc84d7e0729007931d966c0c9dc6d",
    },

    "Binance Smart Chain": {
      rpcURL: "https://data-seed-prebsc-1-s2.binance.org:8545/",
      wsURL: "",
      payerURL: `https://dev-payer.carbon.network`,
      bridgeEntranceAddr: "",
      lockProxyAddr: "0x7c2b13d656d222cb79670e301dd826dc5b8dc20c",
      balanceReader: "0x25c22f65cb820e787a13951f295d0b86db7b07b5",
      byteCodeHash: "0x1b147c1cef546fcbcc1284df778073d65b90f80d5b649a69d5f8a01e186c0ec1",
    },

    "Arbitrum": {
      rpcURL: "https://rinkeby.arbitrum.io/rpc",
      wsURL: "",
      payerURL: "https://test-payer.carbon.network",
      bridgeEntranceAddr: "",
      lockProxyAddr: "",
      balanceReader: "",
      byteCodeHash: "",
    },

    "Polygon": {
      rpcURL: "https://rpc-mumbai.maticvigil.com",
      wsURL: "",
      payerURL: "https://test-payer.carbon.network",
      bridgeEntranceAddr: "",
      lockProxyAddr: "",
      balanceReader: "",
      byteCodeHash: "",
    },

    "OKC": {
      rpcURL: "https://exchaintestrpc.okex.org",
      wsURL: "",
      payerURL: "https://test-payer.carbon.network",
      bridgeEntranceAddr: "",
      lockProxyAddr: "",
      balanceReader: "",
      byteCodeHash: "",
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
      bridgeEntranceAddr: "0xbbe98D54689c96D0278a1222594533e8C5fa551e",
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
      payerURL: `http://localhost:8001`,
      bridgeEntranceAddr: "",
      lockProxyAddr: "",
      balanceReader: "",
      byteCodeHash: "",
    },

    "Binance Smart Chain": {
      rpcURL: "https://data-seed-prebsc-1-s2.binance.org:8545/",
      wsURL: "",
      payerURL: `http://localhost:8001`,
      bridgeEntranceAddr: "",
      lockProxyAddr: "",
      balanceReader: "",
      byteCodeHash: "",
    },

    "Arbitrum": {
      rpcURL: "https://rinkeby.arbitrum.io/rpc",
      wsURL: "",
      payerURL: "https://test-payer.carbon.network",
      bridgeEntranceAddr: "",
      lockProxyAddr: "",
      balanceReader: "",
      byteCodeHash: "",
    },

    "Polygon": {
      rpcURL: "https://rpc-mumbai.maticvigil.com",
      wsURL: "",
      payerURL: "https://test-payer.carbon.network",
      bridgeEntranceAddr: "",
      lockProxyAddr: "",
      balanceReader: "",
      byteCodeHash: "",
    },

    "OKC": {
      rpcURL: "https://exchaintestrpc.okex.org",
      wsURL: "",
      payerURL: "https://test-payer.carbon.network",
      bridgeEntranceAddr: "",
      lockProxyAddr: "",
      balanceReader: "",
      byteCodeHash: "",
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
      bridgeEntranceAddr: "",
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