import { QueryClientImpl as ADLQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/adl/query";
import { QueryClientImpl as BookQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/book/query";
import { QueryClientImpl as BrokerQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/broker/query";
import { QueryClientImpl as CDPQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/cdp/query";
import { QueryClientImpl as CoinQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/coin/query";
import { QueryClientImpl as AuthQueryClient } from "@demex-sdk/codecs/src/cosmos/auth/v1beta1/query";
import { QueryClientImpl as BankQueryClient } from "@demex-sdk/codecs/src/cosmos/bank/v1beta1/query";
import { QueryClientImpl as NativeBankQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/bank/query";
import { QueryClientImpl as BridgeQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/bridge/query";
import { ServiceClientImpl as CosmosTmClient } from "@demex-sdk/codecs/src/cosmos/base/tendermint/v1beta1/query";
import { QueryClientImpl as DistributionQueryClient } from "@demex-sdk/codecs/src/cosmos/distribution/v1beta1/query";
import { QueryClientImpl as EvidenceQueryClient } from "@demex-sdk/codecs/src/cosmos/evidence/v1beta1/query";
import { QueryClientImpl as GovQueryClient } from "@demex-sdk/codecs/src/cosmos/gov/v1/query";
import { QueryClientImpl as GroupQueryClient } from "@demex-sdk/codecs/src/cosmos/group/v1/query";
import { QueryClientImpl as MintQueryClient } from "@demex-sdk/codecs/src/cosmos/mint/v1beta1/query";
import { QueryClientImpl as ParamsQueryClient } from "@demex-sdk/codecs/src/cosmos/params/v1beta1/query";
import { QueryClientImpl as SlashingQueryClient } from "@demex-sdk/codecs/src/cosmos/slashing/v1beta1/query";
import { QueryClientImpl as StakingQueryClient } from "@demex-sdk/codecs/src/cosmos/staking/v1beta1/query";
import { QueryClientImpl as UpgradeQueryClient } from "@demex-sdk/codecs/src/cosmos/upgrade/v1beta1/query";
import { QueryClientImpl as EthermintEVMQueryClient } from "@demex-sdk/codecs/src/ethermint/evm/v1/query";
import { QueryClientImpl as GrantQueryClient } from "@demex-sdk/codecs/src/cosmos/authz/v1beta1/query";
import { QueryClientImpl as FeeGrantQueryClient } from "@demex-sdk/codecs/src/cosmos/feegrant/v1beta1/query";
import { QueryClientImpl as EvmMergeQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/evmmerge/query";
import { QueryClientImpl as EvmBankQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/evmbank/query";
import { QueryClientImpl as EthermintFeeMarketQueryClient } from "@demex-sdk/codecs/src/ethermint/feemarket/v1/query";
import { QueryClientImpl as FeeQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/fee/query";
import { QueryClientImpl as HeadersyncQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/headersync/query";
import { QueryClientImpl as IBCInterchainControlQueryClient } from "@demex-sdk/codecs/src/ibc/applications/interchain_accounts/controller/v1/query";
import { QueryClientImpl as IBCInterchainHostQueryClient } from "@demex-sdk/codecs/src/ibc/applications/interchain_accounts/host/v1/query";
import { QueryClientImpl as IBCTransferQueryClient } from "@demex-sdk/codecs/src/ibc/applications/transfer/v1/query";
import { QueryClientImpl as IBCClientQueryClient } from "@demex-sdk/codecs/src/ibc/core/client/v1/query";
import { QueryClientImpl as IBCConnectionQueryClient } from "@demex-sdk/codecs/src/ibc/core/connection/v1/query";
import { QueryClientImpl as IBCChannelQueryClient } from "@demex-sdk/codecs/src/ibc/core/channel/v1/query";
import { QueryClientImpl as InflationQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/inflation/query";
import { QueryClientImpl as InsuranceQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/insurance/query";
import { QueryClientImpl as LeverageQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/leverage/query";
import { QueryClientImpl as LiquidationQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/liquidation/query";
import { QueryClientImpl as LiquidityPoolQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/liquiditypool/query";
import { QueryClientImpl as MarketQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/market/query";
import { QueryClientImpl as MarketStatsQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/marketstats/query";
import { QueryClientImpl as MiscQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/misc/query";
import { QueryClientImpl as OracleQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/oracle/query";
import { QueryClientImpl as OrderQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/order/query";
import { QueryClientImpl as PositionQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/position/query";
import { QueryClientImpl as PricingQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/pricing/query";
import { QueryClientImpl as ProfileQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/profile/query";
import { QueryClientImpl as SubaccountQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/subaccount/query";
import { QueryClientImpl as AllianceClient } from "@demex-sdk/codecs/src/alliance/alliance/query";
import { QueryClientImpl as PerpspoolQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/perpspool/query";
import { QueryClientImpl as ERC20QueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/erc20/query";
import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { BlockchainClient } from "./chain";
import { GrpcQueryClient } from "./grpc";

export interface IBCClientGroup {
  controller: IBCInterchainControlQueryClient;
  host: IBCInterchainHostQueryClient;
  transfer: IBCTransferQueryClient;

  client: IBCClientQueryClient;
  connection: IBCConnectionQueryClient;
  channel: IBCChannelQueryClient;
}

export interface EthermintClientGroup {
  evm: EthermintEVMQueryClient;
  feeMarket: EthermintFeeMarketQueryClient;
}

export interface CarbonQueryClientOpts {
  tmClient: Tendermint37Client;
  grpcClient?: GrpcQueryClient;
}

export class CarbonQueryClient {
  adl: ADLQueryClient;
  book: BookQueryClient;
  bridge: BridgeQueryClient;
  broker: BrokerQueryClient;
  coin: CoinQueryClient;
  cdp: CDPQueryClient;
  fee: FeeQueryClient;
  inflation: InflationQueryClient;
  insurance: InsuranceQueryClient;
  leverage: LeverageQueryClient;
  liquidation: LiquidationQueryClient;
  liquiditypool: LiquidityPoolQueryClient;
  market: MarketQueryClient;
  marketstats: MarketStatsQueryClient;
  misc: MiscQueryClient;
  oracle: OracleQueryClient;
  order: OrderQueryClient;
  position: PositionQueryClient;
  pricing: PricingQueryClient;
  profile: ProfileQueryClient;
  subaccount: SubaccountQueryClient;
  headersync: HeadersyncQueryClient;
  perpspool: PerpspoolQueryClient;

  auth: AuthQueryClient;
  bank: BankQueryClient;
  nativeBank: NativeBankQueryClient;
  distribution: DistributionQueryClient;
  evidence: EvidenceQueryClient;
  gov: GovQueryClient;
  group: GroupQueryClient;
  mint: MintQueryClient;
  params: ParamsQueryClient;
  slashing: SlashingQueryClient;
  staking: StakingQueryClient;
  upgrade: UpgradeQueryClient;
  cosmosTm: CosmosTmClient;
  grant: GrantQueryClient;
  feegrant: FeeGrantQueryClient;

  alliance: AllianceClient;

  chain: BlockchainClient;
  ibc: IBCClientGroup;
  ethermint: EthermintClientGroup;
  evmmerge: EvmMergeQueryClient;
  evmbank: EvmBankQueryClient;

  erc20: ERC20QueryClient;

  constructor(opts: CarbonQueryClientOpts) {
    const rpcClient = opts.grpcClient ?? createProtobufRpcClient(new QueryClient(opts.tmClient));

    this.chain = BlockchainClient.connectWithTm(opts.tmClient);

    this.adl = new ADLQueryClient(rpcClient);
    this.alliance = new AllianceClient(rpcClient);
    this.book = new BookQueryClient(rpcClient);
    this.bridge = new BridgeQueryClient(rpcClient);
    this.broker = new BrokerQueryClient(rpcClient);
    this.coin = new CoinQueryClient(rpcClient);
    this.cdp = new CDPQueryClient(rpcClient);
    this.fee = new FeeQueryClient(rpcClient);
    this.inflation = new InflationQueryClient(rpcClient);
    this.insurance = new InsuranceQueryClient(rpcClient);
    this.leverage = new LeverageQueryClient(rpcClient);
    this.liquidation = new LiquidationQueryClient(rpcClient);
    this.liquiditypool = new LiquidityPoolQueryClient(rpcClient);
    this.market = new MarketQueryClient(rpcClient);
    this.marketstats = new MarketStatsQueryClient(rpcClient);
    this.misc = new MiscQueryClient(rpcClient);
    this.oracle = new OracleQueryClient(rpcClient);
    this.order = new OrderQueryClient(rpcClient);
    this.position = new PositionQueryClient(rpcClient);
    this.pricing = new PricingQueryClient(rpcClient);
    this.profile = new ProfileQueryClient(rpcClient);
    this.subaccount = new SubaccountQueryClient(rpcClient);
    this.headersync = new HeadersyncQueryClient(rpcClient);
    this.evmmerge = new EvmMergeQueryClient(rpcClient);
    this.evmbank = new EvmBankQueryClient(rpcClient);
    this.perpspool = new PerpspoolQueryClient(rpcClient);

    this.auth = new AuthQueryClient(rpcClient);
    this.bank = new BankQueryClient(rpcClient);
    this.nativeBank = new NativeBankQueryClient(rpcClient);
    this.distribution = new DistributionQueryClient(rpcClient);
    this.evidence = new EvidenceQueryClient(rpcClient);
    this.grant = new GrantQueryClient(rpcClient);
    this.feegrant = new FeeGrantQueryClient(rpcClient);
    this.group = new GroupQueryClient(rpcClient);
    this.gov = new GovQueryClient(rpcClient);
    this.mint = new MintQueryClient(rpcClient);
    this.params = new ParamsQueryClient(rpcClient);
    this.slashing = new SlashingQueryClient(rpcClient);
    this.staking = new StakingQueryClient(rpcClient);
    this.upgrade = new UpgradeQueryClient(rpcClient);
    this.cosmosTm = new CosmosTmClient(rpcClient);

    this.alliance = new AllianceClient(rpcClient);
    this.erc20 = new ERC20QueryClient(rpcClient)

    this.ibc = {
      controller: new IBCInterchainControlQueryClient(rpcClient),
      host: new IBCInterchainHostQueryClient(rpcClient),
      transfer: new IBCTransferQueryClient(rpcClient),
      client: new IBCClientQueryClient(rpcClient),
      connection: new IBCConnectionQueryClient(rpcClient),
      channel: new IBCChannelQueryClient(rpcClient),
    };

    this.ethermint = {
      evm: new EthermintEVMQueryClient(rpcClient),
      feeMarket: new EthermintFeeMarketQueryClient(rpcClient),
    }
  }

  static async connect(tmRpcUrl: string) {
    const tmClient = await Tendermint37Client.connect(tmRpcUrl);
    return new CarbonQueryClient({ tmClient });
  }
}
