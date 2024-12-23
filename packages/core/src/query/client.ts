import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { AdlQueryClient, AllianceQueryClient, AuthQueryClient, AuthzQueryClient, BankQueryClient, BookQueryClient, BridgeQueryClient, BrokerQueryClient, CdpQueryClient, ChannelQueryClient, ClientQueryClient, CoinQueryClient, ConnectionQueryClient, ControllerQueryClient, DemexBankQueryClient, DemexFeeQueryClient, DistributionQueryClient, Erc20QueryClient, EvidenceQueryClient, EvmbankQueryClient, EvmmergeQueryClient, EvmQueryClient, FeegrantQueryClient, FeemarketQueryClient, GovV1QueryClient, GroupQueryClient, HeadersyncQueryClient, HostQueryClient, InflationQueryClient, InsuranceQueryClient, LeverageQueryClient, LiquidationQueryClient, LiquiditypoolQueryClient, MarketQueryClient, MarketstatsQueryClient, MintQueryClient, MiscQueryClient, OracleQueryClient, OrderQueryClient, ParamsQueryClient, PerpspoolQueryClient, PositionQueryClient, PricingQueryClient, ProfileQueryClient, SlashingQueryClient, StakingQueryClient, SubaccountQueryClient, TendermintQueryClient, TransferQueryClient, UpgradeQueryClient } from "@demex-sdk/codecs";
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
  adl: new AdlQueryClient(rpcClient),
  alliance: new AllianceQueryClient(rpcClient),
  book: new BookQueryClient(rpcClient),
  bridge: new BridgeQueryClient(rpcClient),
  broker: new BrokerQueryClient(rpcClient),
  coin: new CoinQueryClient(rpcClient),
  cdp: new CdpQueryClient(rpcClient),
  fee: new DemexFeeQueryClient(rpcClient),
  inflation: new InflationQueryClient(rpcClient),
  insurance: new InsuranceQueryClient(rpcClient),
  leverage: new LeverageQueryClient(rpcClient),
  liquidation: new LiquidationQueryClient(rpcClient),
  liquiditypool: new LiquiditypoolQueryClient(rpcClient),
  market: new MarketQueryClient(rpcClient),
  marketstats: new MarketstatsQueryClient(rpcClient),
  misc: new MiscQueryClient(rpcClient),
  oracle: new OracleQueryClient(rpcClient),
  order: new OrderQueryClient(rpcClient),
  position: new PositionQueryClient(rpcClient),
  pricing: new PricingQueryClient(rpcClient),
  profile: new ProfileQueryClient(rpcClient),
  subaccount: new SubaccountQueryClient(rpcClient),
  headersync: new HeadersyncQueryClient(rpcClient),
  evmmerge: new EvmmergeQueryClient(rpcClient),
  evmbank: new EvmbankQueryClient(rpcClient),
  perpspool: new PerpspoolQueryClient(rpcClient),

  auth: new AuthQueryClient(rpcClient),
  bank: new BankQueryClient(rpcClient),
  nativeBank: new DemexBankQueryClient(rpcClient),
  distribution: new DistributionQueryClient(rpcClient),
  evidence: new EvidenceQueryClient(rpcClient),
  authz: new AuthzQueryClient(rpcClient),
  feegrant: new FeegrantQueryClient(rpcClient),
  group: new GroupQueryClient(rpcClient),
  gov: new GovV1QueryClient(rpcClient),
  mint: new MintQueryClient(rpcClient),
  params: new ParamsQueryClient(rpcClient),
  slashing: new SlashingQueryClient(rpcClient),
  staking: new StakingQueryClient(rpcClient),
  upgrade: new UpgradeQueryClient(rpcClient),
  tendermint: new TendermintQueryClient(rpcClient),

  erc20: new Erc20QueryClient(rpcClient),

  ibc: {
    controller: new ControllerQueryClient(rpcClient),
    host: new HostQueryClient(rpcClient),
    transfer: new TransferQueryClient(rpcClient),
    client: new ClientQueryClient(rpcClient),
    connection: new ConnectionQueryClient(rpcClient),
    channel: new ChannelQueryClient(rpcClient),
  },

  ethermint: {
    evm: new EvmQueryClient(rpcClient),
    feeMarket: new FeemarketQueryClient(rpcClient),
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
