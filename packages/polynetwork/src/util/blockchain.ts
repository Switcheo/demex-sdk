import { Network } from "@demex-sdk/core";
import { Blockchain } from "../env";

export const blockchainForChainId = (chainId?: number, network = Network.MainNet): Blockchain | undefined => {
  switch (network) {
    case Network.MainNet:
      switch (chainId) {
        case 0:
          return Blockchain.Native
        case 1:
          return Blockchain.Btc
        case 2:
          return Blockchain.Ethereum
        case 4:
          return Blockchain.Neo
        case 6:
          return Blockchain.BinanceSmartChain
        case 14:
          return Blockchain.Neo3
        case 9:  /* FALLTHROUGH */
        case 18:
          return Blockchain.Zilliqa
        case 12: /* FALLTHROUGH */
        case 66:
          return Blockchain.Okc
        case 17: /* FALLTHROUGH */
        case 137:
          return Blockchain.Polygon
        case 244:
          return Blockchain.Osmosis
        case 13: /* FALLTHROUGH */
        case 245:
          return Blockchain.Terra
        case 246:
          return Blockchain.CosmosHub
        case 5: /* FALLTHROUGH */
        case 247:
          return Blockchain.Juno
        case 7: /* FALLTHROUGH */
        case 248:
          return Blockchain.Evmos
        case 8: /* FALLTHROUGH */
        case 249:
          return Blockchain.Axelar
        case 313:
          return Blockchain.Stride
        case 314:
          return Blockchain.Kujira
        case 315:
          return Blockchain.Terra2
        case 316:
          return Blockchain.Quicksilver
        // eslint duplicate case
        // case 12: /* FALLTHROUGH */
        case 317:
          return Blockchain.Comdex
        case 318:
          return Blockchain.StafiHub
        case 15: /* FALLTHROUGH */
        case 319:
          return Blockchain.Persistence
        case 16: /* FALLTHROUGH */
        case 320:
          return Blockchain.Stargaze
        case 321:
          return Blockchain.Canto
        case 322:
          return Blockchain.OmniFlixHub
        case 323:
          return Blockchain.Agoric
        case 19: /* FALLTHROUGH */
        case 42161:
          return Blockchain.Arbitrum
        case 5000:
          return Blockchain.Mantle
        case 10:
          return Blockchain.OP
        case 8453:
          return Blockchain.Base
        default:
          return undefined
      }
    case Network.TestNet:
      switch (chainId) {
        case 1:
          return Blockchain.Btc
        case 0:
        case 5:
          return Blockchain.Carbon
        case 79:
          return Blockchain.BinanceSmartChain
        case 88:
          return Blockchain.Neo3
        case 111:
          return Blockchain.Zilliqa
        case 2: /* FALLTHROUGH */
        case 502:
          return Blockchain.Ethereum
        case 5003:
          return Blockchain.Mantle
        case 11155420:
          return Blockchain.OP
        case 84532:
          return Blockchain.Base
        default:
          return undefined
      }
    case Network.DevNet:
      switch (chainId) {
        case 0:
          return Blockchain.Carbon
        case 1:
          return Blockchain.Btc
        case 2:
        case 350:
          return Blockchain.Ethereum
        case 5:
          return Blockchain.Neo
        case 79:
          return Blockchain.BinanceSmartChain
        case 111:
          return Blockchain.Zilliqa
        case 5003:
          return Blockchain.Mantle
        case 11155420:
          return Blockchain.OP
        case 84532:
          return Blockchain.Base
        default:
          return undefined
      }
    case Network.Local:
      return undefined
    default:
      return undefined
  }
};