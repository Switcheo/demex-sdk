import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { QueryClients as Q } from "@demex-sdk/codecs";
import { BlockchainClient } from "./chain";
import { GrpcQueryClient } from "./grpc";

export interface DemexQueryClientOpts {
  tmClient: Tendermint37Client;
  grpcClient?: GrpcQueryClient;
}

interface Rpc {
  request(
    service: string,
    method: string,
    data: Uint8Array
  ): Promise<Uint8Array>;
}

const extendQueryClient = (tmClient: Tendermint37Client, rpcClient: Rpc) => QueryClient.withExtensions(tmClient, () => ({
  adl: new Q.AdlQueryClient(rpcClient),
  alliance: new Q.AllianceQueryClient(rpcClient),
  book: new Q.BookQueryClient(rpcClient),
  bridge: new Q.BridgeQueryClient(rpcClient),
  broker: new Q.BrokerQueryClient(rpcClient),
  coin: new Q.CoinQueryClient(rpcClient),
  cdp: new Q.CdpQueryClient(rpcClient),
  fee: new Q.DemexFeeQueryClient(rpcClient),
  inflation: new Q.InflationQueryClient(rpcClient),
  insurance: new Q.InsuranceQueryClient(rpcClient),
  leverage: new Q.LeverageQueryClient(rpcClient),
  liquidation: new Q.LiquidationQueryClient(rpcClient),
  liquiditypool: new Q.LiquiditypoolQueryClient(rpcClient),
  market: new Q.MarketQueryClient(rpcClient),
  marketstats: new Q.MarketstatsQueryClient(rpcClient),
  misc: new Q.MiscQueryClient(rpcClient),
  oracle: new Q.OracleQueryClient(rpcClient),
  order: new Q.OrderQueryClient(rpcClient),
  position: new Q.PositionQueryClient(rpcClient),
  pricing: new Q.PricingQueryClient(rpcClient),
  profile: new Q.ProfileQueryClient(rpcClient),
  subaccount: new Q.SubaccountQueryClient(rpcClient),
  headersync: new Q.HeadersyncQueryClient(rpcClient),
  evmmerge: new Q.EvmmergeQueryClient(rpcClient),
  evmbank: new Q.EvmbankQueryClient(rpcClient),
  perpspool: new Q.PerpspoolQueryClient(rpcClient),

  auth: new Q.AuthQueryClient(rpcClient),
  bank: new Q.BankQueryClient(rpcClient),
  nativeBank: new Q.DemexBankQueryClient(rpcClient),
  distribution: new Q.DistributionQueryClient(rpcClient),
  evidence: new Q.EvidenceQueryClient(rpcClient),
  authz: new Q.AuthzQueryClient(rpcClient),
  feegrant: new Q.FeegrantQueryClient(rpcClient),
  group: new Q.GroupQueryClient(rpcClient),
  gov: new Q.GovV1QueryClient(rpcClient),
  mint: new Q.MintQueryClient(rpcClient),
  params: new Q.ParamsQueryClient(rpcClient),
  slashing: new Q.SlashingQueryClient(rpcClient),
  staking: new Q.StakingQueryClient(rpcClient),
  upgrade: new Q.UpgradeQueryClient(rpcClient),
  tendermint: new Q.TendermintQueryClient(rpcClient),

  erc20: new Q.Erc20QueryClient(rpcClient),

  ibc: {
    controller: new Q.ControllerQueryClient(rpcClient),
    host: new Q.HostQueryClient(rpcClient),
    transfer: new Q.TransferQueryClient(rpcClient),
    client: new Q.ClientQueryClient(rpcClient),
    connection: new Q.ConnectionQueryClient(rpcClient),
    channel: new Q.ChannelQueryClient(rpcClient),
  },

  ethermint: {
    evm: new Q.EvmQueryClient(rpcClient),
    feeMarket: new Q.FeemarketQueryClient(rpcClient),
  },
}));

type DemexQueryClient = ReturnType<typeof extendQueryClient> & {
  chain: BlockchainClient
};
namespace DemexQueryClient {
  export const instance = (opts: DemexQueryClientOpts): DemexQueryClient => {
    const rpcClient = opts.grpcClient ?? createProtobufRpcClient(new QueryClient(opts.tmClient));
    const result = extendQueryClient(opts.tmClient, rpcClient) as DemexQueryClient;
    // cannot pass chain: BlockchainClient as an extension because 
    // of spread operators in withExtensions handler
    // see https://github.com/cosmos/cosmjs/blob/e819a1fc0e99a3e5320d8d6667a08d3b92e5e836/packages/stargate/src/queryclient/queryclient.ts#L502
    result.chain = BlockchainClient.connectWithTm(opts.tmClient);
    return result
  }
}

export { DemexQueryClient };
