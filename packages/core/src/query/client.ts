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
  chain: BlockchainClient.connectWithTm(tmClient),

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
}))

type DemexQueryClient = ReturnType<typeof extendQueryClient>;
namespace DemexQueryClient {
  export const instance = (opts: DemexQueryClientOpts) => {
    const rpcClient = opts.grpcClient ?? createProtobufRpcClient(new QueryClient(opts.tmClient));
    return extendQueryClient(opts.tmClient, rpcClient);
  }
}

export { DemexQueryClient };
