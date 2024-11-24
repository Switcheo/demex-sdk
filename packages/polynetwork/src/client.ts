import { Network, TokenClient } from "@demex-sdk/core";
import { Blockchain, PolynetworkConfig, PolynetworkConfigs } from "./env";
import { ETHClient, NEOClient, N3Client, ZILClient } from "./clients";

export class PolynetworkClient {
  neo: NEOClient;
  eth: ETHClient;
  bsc: ETHClient;
  arbitrum: ETHClient;
  polygon: ETHClient;
  mantle: ETHClient;
  op: ETHClient;
  base: ETHClient;
  okc: ETHClient;
  zil: ZILClient;
  n3: N3Client;

  private constructor(
    public readonly tokenClient: TokenClient,
    public readonly polynetworkConfig: PolynetworkConfig,
    public readonly network: Network,
  ) {
    this.neo = NEOClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: Blockchain.Neo,
      network,
    });

    this.n3 = N3Client.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: Blockchain.Neo3,
      network,
    });

    this.eth = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: Blockchain.Ethereum,
      network,
    });

    this.bsc = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: Blockchain.BinanceSmartChain,
      network,
    });

    this.zil = ZILClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: Blockchain.Zilliqa,
      network,
    });

    this.arbitrum = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: Blockchain.Arbitrum,
      network,
    });

    this.polygon = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: Blockchain.Polygon,
      network,
    });

    this.okc = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: Blockchain.Okc,
      network,
    });

    this.mantle = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: Blockchain.Mantle,
      network,
    });

    this.op = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: Blockchain.OP,
      network,
    });

    this.base = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: Blockchain.Base,
      network,
    });
  };

  public static instance(tokenClient: TokenClient, network: Network) {
    const polynetworkConfig = PolynetworkConfigs[network];
    return new PolynetworkClient(tokenClient, polynetworkConfig, network);
  };
};