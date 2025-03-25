import Codecs from "@demex-sdk/codecs";
import Long from "long";
import { PGN_10K } from "../constant";
import { AxelarBridge, Blockchain, BRIDGE_IDS, BridgeMap, ibcTokenRegex, Network, NetworkConfig, PolyNetworkBridge, regexCdpDenom, regexLPDenom } from "../env";
import { DemexQueryClient } from "../query";
import { OptionalNetworkMap, SimpleMap } from "../util";

export const TokenBlacklist: OptionalNetworkMap<string[]> = {
  [Network.MainNet]: [
    "brkl.1.2.337f55", // wrong token address
    "zusdt.1.18.1cbca1", // duplicated token
  ],
};

export class TokenClient {
  private tokens: SimpleMap<Codecs.Carbon.Coin.Token> | null = null;
  private bridges: BridgeMap | null = null;

  private constructor(public readonly query: DemexQueryClient, public readonly networkConfig: NetworkConfig) { }

  public static instance(query: DemexQueryClient, networkConfig: NetworkConfig) {
    return new TokenClient(query, networkConfig);
  }

  public async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.getAllTokens(),
        this.getBridges(),
      ]);
    } catch (err) {
      const errorTyped = err as Error;
      console.error("failed to query token and bridge info:", errorTyped.message);
    }
  }

  public async getAllTokens(): Promise<Codecs.Carbon.Coin.Token[]> {
    if (!this.tokens) {
      this.tokens = {};
      const result = await this.query.coin.TokenAll({ pagination: PGN_10K });
      const tokenBlacklist = TokenBlacklist[this.networkConfig.network] ?? [];
      result.tokens.forEach((token: Codecs.Carbon.Coin.Token) => {
        if (tokenBlacklist.includes(token.denom)) return;
        this.tokens![token.denom] = token;
      });
    }
    return Object.values(this.tokens) ?? [];
  };

  public async getBridges(): Promise<BridgeMap> {
    if (!this.bridges) {
      const allBridges = await this.query.coin.BridgeAll({ pagination: PGN_10K });
      const axelarBridges = await this.mapBridgesFromConnections()

      const polynetworkBridges = allBridges.bridges.reduce((prev: PolyNetworkBridge[], bridge: Codecs.Carbon.Coin.Bridge) => {
        if (bridge.bridgeId.toNumber() !== BRIDGE_IDS.polynetwork) return prev;
        prev.push({ ...bridge } as PolyNetworkBridge);
        return prev;
      }, [])

      this.bridges = {
        polynetwork: polynetworkBridges,
        axelar: axelarBridges,
      };
    }
    return this.bridges!;
  }

  async mapBridgesFromConnections(): Promise<AxelarBridge[]> {
    const newBridges: AxelarBridge[] = []
    try {
      const results: Codecs.Carbon.Bridge.QueryAllConnectionsResponse = await this.query.bridge.ConnectionAll({
        bridgeId: new Long(0),
        pagination: PGN_10K,
      });
      const connections = results.connections
      connections.forEach((connection: Codecs.Carbon.Bridge.Connection) => {
        newBridges.push({
          name: `${connection.chainDisplayName} via Axelar`,
          bridgeId: new Long(BRIDGE_IDS.axelar),
          chainId: new Long(BRIDGE_IDS.axelar),
          bridgeAddress: connection.connectionId,
          chain_id_name: connection.chainId,
          chainName: connection.chainDisplayName,
          bridgeName: 'Axelar',
          bridgeAddresses: [],
          enabled: connection.isEnabled,
        });
      });
    } catch (err) {
      console.error(err)
    } finally {
      const chainMap: SimpleMap<string> = {};

      newBridges.forEach((bridge) => {
        const chainId = bridge.chain_id_name;
        if (chainMap[chainId]) {
          bridge.chainName = chainMap[chainId];
        } else {
          chainMap[chainId] = bridge.chainName;
        }
      });
    }
    return newBridges;
  };

  public getBlockchain(denom: string | undefined): Blockchain | undefined {
    if (!denom || !this.tokens?.[denom]) return undefined
    const token = this.tokens[denom];
    if (this.isNativeToken(denom) || this.isNativeStablecoin(denom) || TokenClient.isPoolToken(denom) || TokenClient.isCdpToken(denom) || this.isGroupedToken(denom)) {
      // native denoms "swth" and "usc" should be native.
      // pool and cdp tokens are on the Native blockchain, hence 0
      return 'Native'
    }

    if (this.isBridgedToken(denom)) {
      // brdg tokens will all be chain_id 0 which will also be deprecated in future
      // hence for brdg tokens cannot use chain_id to differentiate between blockchains
      const chainName = this.bridges?.axelar.find((bridge: AxelarBridge) => bridge.bridgeAddress === token.bridgeAddress)?.chainName
      return chainName
    }
    const bridge = this.getBridgeFromToken(token)
    return bridge?.chainName;
  };

  public getBridgesFromBridgeId(bridgeId: number): Codecs.Carbon.Coin.Bridge[] | AxelarBridge[] | undefined {
    switch (bridgeId) {
      case BRIDGE_IDS.polynetwork:
        return this.bridges?.polynetwork
      case BRIDGE_IDS.axelar:
        return this.bridges?.axelar
      default:
        return undefined
    }
  };

  public getBridgeFromToken(token: Codecs.Carbon.Coin.Token | null): Codecs.Carbon.Coin.Bridge | undefined {
    if (!token || !token.bridgeId) return undefined
    const bridgeList = this.getBridgesFromBridgeId(token.bridgeId.toNumber())
    return bridgeList?.find(bridge => token.chainId.equals(bridge.chainId))
  };

  public getPolynetworkBlockchainNames(): string[] {
    return (this.bridges?.polynetwork ?? []).map((bridge: PolyNetworkBridge) => bridge.chainName);
  };

  public getAxelarBlockchainNames(): string[] {
    return (this.bridges?.axelar ?? []).map((bridge: AxelarBridge) => bridge.chainName);
  };

  public getAllBlockchainNames(): string[] {
    return this.getPolynetworkBlockchainNames().concat(this.getAxelarBlockchainNames());
  };

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