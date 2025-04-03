import { StargateClient } from "@cosmjs/stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { NetworkConfig } from "../env";
import { Mutex } from "../util";
import { DemexQueryClient } from "./client";

export interface ClientProviderOpts {
  networkConfig: NetworkConfig
  
  tmClient?: Tendermint37Client
  queryClient?: DemexQueryClient
  stargateClient?: StargateClient
}
export abstract class ClientProvider {
  protected networkConfig: NetworkConfig

  protected _mutexes: Record<string, Mutex> = {}

  protected _tmClient?: Tendermint37Client
  protected _queryClient?: DemexQueryClient
  protected _stargateClient?: StargateClient

  constructor(opts: ClientProviderOpts) {
    this.networkConfig = opts.networkConfig;

    this._tmClient = opts.tmClient;
    this._queryClient = opts.queryClient;
    this._stargateClient = opts.stargateClient;
  }

  public getNetworkConfig() {
    return this.networkConfig;
  }

  public async getTmClient(): Promise<Tendermint37Client> {
    const release = await (this._mutexes.tmClient ??= new Mutex()).lock();
    try {
      if (!this._tmClient)
        this._tmClient = await Tendermint37Client.connect(this.networkConfig.tmRpcUrl);
      return this._tmClient;
    } finally {
      release();
    }
  }
  public async getStargateClient(): Promise<StargateClient> {
    const release = await (this._mutexes.stargateClient ??= new Mutex()).lock();
    try {
      if (this._stargateClient) return this._stargateClient;
      const tmClient = await this.getTmClient();
      this._stargateClient = await StargateClient.create(tmClient);
      return this._stargateClient;
    } finally {
      release();
    }
  }
  public async getQueryClient(): Promise<DemexQueryClient> {
    const release = await (this._mutexes.queryClient ??= new Mutex()).lock();
    try {
      if (this._queryClient) return this._queryClient;
      const tmClient = await this.getTmClient();
      this._queryClient = await DemexQueryClient.instance({ tmClient });
      return this._queryClient;
    } finally {
      release();
    }
  }

}
