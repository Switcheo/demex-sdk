import { Network, TokenClient } from "@demex-sdk/core";
import { Blockchain, PolynetworkConfig, PolynetworkConfigs } from "./env";
import { ETHClient, N3Client, NEOClient, ZILClient } from "./helpers";

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
      network,
    });

    this.n3 = N3Client.instance({
      polynetworkConfig,
      tokenClient,
      network,
    });

    this.eth = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: "Ethereum",
      network,
    });

    this.bsc = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: "Binance Smart Chain",
      network,
    });

    this.zil = ZILClient.instance({
      polynetworkConfig,
      tokenClient,
      network,
    });

    this.arbitrum = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: "Arbitrum",
      network,
    });

    this.polygon = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: "Polygon",
      network,
    });

    this.okc = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: "OKC",
      network,
    });

    this.mantle = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: "Mantle",
      network,
    });

    this.op = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: "OP",
      network,
    });

    this.base = ETHClient.instance({
      polynetworkConfig,
      tokenClient,
      blockchain: "Base",
      network,
    });
  };

  public static instance(tokenClient: TokenClient, network: Network) {
    const polynetworkConfig = PolynetworkConfigs[network];
    return new PolynetworkClient(tokenClient, polynetworkConfig, network);
  };
};