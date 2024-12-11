import { Carbon } from "@demex-sdk/codecs";
import { GetFeeQuoteResponse } from "@demex-sdk/hydrogen";
import Long from "long";
import { AxelarBridge, BlockchainV2, BRIDGE_IDS, BridgeMap, IbcBridge, ibcTokenRegex, Network, NetworkConfig, PolyNetworkBridge, regexCdpDenom, regexLPDenom } from "../env";
import { DemexQueryClient } from "../query";
import { OptionalNetworkMap, SimpleMap } from "../util";

export const TokenBlacklist: OptionalNetworkMap<string[]> = {
  [Network.MainNet]: [
    "brkl.1.2.337f55", // wrong token address
    "zusdt.1.18.1cbca1", // duplicated token
  ],
};

// This class is just created as a stand-in class for polynetwork bridge helpers (i.e. packages/polynetwork/src/clients/...), this is not final
// Pls make any changes if required
export class TokenClient {
  public readonly tokens: SimpleMap<Carbon.Coin.Token> = {};
  public readonly bridges: BridgeMap = { polynetwork: [], ibc: [], axelar: [] };

  private constructor(public readonly query: DemexQueryClient, public readonly networkConfig: NetworkConfig) { }

  public static instance(query: DemexQueryClient, networkConfig: NetworkConfig) {
    return new TokenClient(query, networkConfig);
  }

  public async getAllTokens(): Promise<Carbon.Coin.Token[]> {
    const result = await this.query.coin.TokenAll({
      pagination: {
        limit: new Long(10000),
        offset: Long.UZERO,
        key: new Uint8Array(),
        countTotal: false,
        reverse: false,
      },
    });

    const tokenBlacklist = TokenBlacklist[this.networkConfig.network] ?? [];
    return result.tokens.filter((token: Carbon.Coin.Token) => !tokenBlacklist.includes(token.denom));
  };

  public getBlockchain(denom: string | undefined): BlockchainV2 | undefined {
    if (!denom) return undefined
    const token = this.tokens[denom]
    if (this.isNativeToken(denom) || this.isNativeStablecoin(denom) || TokenClient.isPoolToken(denom) || TokenClient.isCdpToken(denom) || this.isGroupedToken(denom)) {
      // native denoms "swth" and "usc" should be native.
      // pool and cdp tokens are on the Native blockchain, hence 0
      return 'Native'
    }

    if (this.isBridgedToken(denom)) {
      // brdg tokens will all be chain_id 0 which will also be deprecated in future
      // hence for brdg tokens cannot use chain_id to differentiate between blockchains
      const bridgeList = this.bridges.axelar
      const chainName = bridgeList.find((bridge: AxelarBridge) => bridge.bridgeAddress === token.bridgeAddress)?.chainName
      return chainName
    }
    const bridge = this.getBridgeFromToken(token)
    return bridge?.chainName;
  };

  public getBridgesFromBridgeId(bridgeId: number): Carbon.Coin.Bridge[] | IbcBridge[] | AxelarBridge[] {
    switch (bridgeId) {
      case BRIDGE_IDS.polynetwork:
        return this.bridges.polynetwork
      case BRIDGE_IDS.ibc:
        return this.bridges.ibc
      case BRIDGE_IDS.axelar:
        return this.bridges.axelar
      default:
        return this.bridges.polynetwork
    }
  };

  public getBridgeFromToken(token: Carbon.Coin.Token | null): Carbon.Coin.Bridge | IbcBridge | undefined {
    if (!token || !token.bridgeId) return undefined
    const bridgeList = this.getBridgesFromBridgeId(token.bridgeId.toNumber())
    return bridgeList.find(bridge => token.chainId.equals(bridge.chainId))
  };

  public async getFeeInfo(denom: string): Promise<GetFeeQuoteResponse> {
    const url = `${this.networkConfig.hydrogenUrl}/fee_quote?token_denom=${denom}`;
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
    const result = await fetch(url, requestOptions).then((res) => res.json());

    return result as GetFeeQuoteResponse;
  };

  public getPolynetworkBlockchainNames(): string[] {
    return this.bridges.polynetwork.map((bridge: PolyNetworkBridge) => bridge.chainName);
  };

  public getIbcBlockchainNames(): string[] {
    return this.bridges.ibc.map((bridge: IbcBridge) => bridge.chainName)
  }

  public getAxelarBlockchainNames(): string[] {
    return this.bridges.axelar.map((bridge: AxelarBridge) => bridge.chainName)
  }

  public getAllBlockchainNames(): string[] {
    return this.getIbcBlockchainNames().concat(this.getPolynetworkBlockchainNames()).concat(this.getAxelarBlockchainNames())
  }

  public isNativeToken(denom: string): boolean {
    return denom === "swth";
  };

  public isNativeStablecoin(denom: string): boolean {
    return denom === "usc";
  };

  public static isPoolToken(denom: string): boolean {
    return this.isPoolTokenNew(denom) || this.isPoolTokenLegacy(denom);
  };

  public static isPoolTokenNew(denom: string): boolean {
    return denom.match(regexLPDenom) !== null;
  };

  public static isPoolTokenLegacy(denom: string): boolean {
    return denom.match(/^([a-z\d.-]+)-(\d+)-([a-z\d.-]+)-(\d+)-lp\d+$/i) !== null;
  };

  public static isCdpToken(denom: string): boolean {
    return denom.match(regexCdpDenom) !== null;
  };

  public static isIBCDenom(denom: string): boolean {
    return denom.match(ibcTokenRegex) !== null;
  };
  
  public isBridgedToken(denom: string): boolean {
    const bridgedTokenRegex = new RegExp(/^brdg\//)
    return bridgedTokenRegex.test(denom)
  };

  public isGroupedToken(denom: string): boolean {
    const groupedTokenRegex = new RegExp(/^cgt\/\d+$/)
    return groupedTokenRegex.test(denom)
  };
};