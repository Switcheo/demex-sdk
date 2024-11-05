import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { QueryClientImpl as AllianceClient } from "@demex-sdk/codecs/src/alliance/alliance/query";
import { QueryClientImpl as AuthQueryClient } from "@demex-sdk/codecs/src/cosmos/auth/v1beta1/query";
import { QueryClientImpl as GrantQueryClient } from "@demex-sdk/codecs/src/cosmos/authz/v1beta1/query";
import { QueryClientImpl as BankQueryClient } from "@demex-sdk/codecs/src/cosmos/bank/v1beta1/query";
import { ServiceClientImpl as CosmosTmClient } from "@demex-sdk/codecs/src/cosmos/base/tendermint/v1beta1/query";
import { QueryClientImpl as DistributionQueryClient } from "@demex-sdk/codecs/src/cosmos/distribution/v1beta1/query";
import { QueryClientImpl as EvidenceQueryClient } from "@demex-sdk/codecs/src/cosmos/evidence/v1beta1/query";
import { QueryClientImpl as FeeGrantQueryClient } from "@demex-sdk/codecs/src/cosmos/feegrant/v1beta1/query";
import { QueryClientImpl as GovQueryClient } from "@demex-sdk/codecs/src/cosmos/gov/v1/query";
import { QueryClientImpl as GroupQueryClient } from "@demex-sdk/codecs/src/cosmos/group/v1/query";
import { QueryClientImpl as MintQueryClient } from "@demex-sdk/codecs/src/cosmos/mint/v1beta1/query";
import { QueryClientImpl as ParamsQueryClient } from "@demex-sdk/codecs/src/cosmos/params/v1beta1/query";
import { QueryClientImpl as SlashingQueryClient } from "@demex-sdk/codecs/src/cosmos/slashing/v1beta1/query";
import { QueryClientImpl as StakingQueryClient } from "@demex-sdk/codecs/src/cosmos/staking/v1beta1/query";
import { QueryClientImpl as UpgradeQueryClient } from "@demex-sdk/codecs/src/cosmos/upgrade/v1beta1/query";
import { QueryClientImpl as EthermintEVMQueryClient } from "@demex-sdk/codecs/src/ethermint/evm/v1/query";
import { QueryClientImpl as EthermintFeeMarketQueryClient } from "@demex-sdk/codecs/src/ethermint/feemarket/v1/query";
import { QueryClientImpl as IBCInterchainControlQueryClient } from "@demex-sdk/codecs/src/ibc/applications/interchain_accounts/controller/v1/query";
import { QueryClientImpl as IBCInterchainHostQueryClient } from "@demex-sdk/codecs/src/ibc/applications/interchain_accounts/host/v1/query";
import { QueryClientImpl as IBCTransferQueryClient } from "@demex-sdk/codecs/src/ibc/applications/transfer/v1/query";
import { QueryClientImpl as IBCChannelQueryClient } from "@demex-sdk/codecs/src/ibc/core/channel/v1/query";
import { QueryClientImpl as IBCClientQueryClient } from "@demex-sdk/codecs/src/ibc/core/client/v1/query";
import { QueryClientImpl as IBCConnectionQueryClient } from "@demex-sdk/codecs/src/ibc/core/connection/v1/query";
import { QueryClientImpl as ADLQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/adl/query";
import { QueryClientImpl as NativeBankQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/bank/query";
import { QueryClientImpl as BookQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/book/query";
import { QueryClientImpl as BridgeQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/bridge/query";
import { QueryClientImpl as BrokerQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/broker/query";
import { QueryClientImpl as CDPQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/cdp/query";
import { QueryClientImpl as CoinQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/coin/query";
import { QueryClientImpl as ERC20QueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/erc20/query";
import { QueryClientImpl as EvmBankQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/evmbank/query";
import { QueryClientImpl as EvmMergeQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/evmmerge/query";
import { QueryClientImpl as FeeQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/fee/query";
import { QueryClientImpl as HeadersyncQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/headersync/query";
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
import { QueryClientImpl as PerpspoolQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/perpspool/query";
import { QueryClientImpl as PositionQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/position/query";
import { QueryClientImpl as PricingQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/pricing/query";
import { QueryClientImpl as ProfileQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/profile/query";
import { QueryClientImpl as SubaccountQueryClient } from "@demex-sdk/codecs/src/Switcheo/carbon/subaccount/query";
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

export class CarbonQueryClient extends QueryClient {
  static instance(opts: CarbonQueryClientOpts) {
    const rpcClient = opts.grpcClient ?? createProtobufRpcClient(new QueryClient(opts.tmClient));

    const queryClient = CarbonQueryClient.withExtensions(opts.tmClient, () => ({
      chain: BlockchainClient.connectWithTm(opts.tmClient),

      adl: new ADLQueryClient(rpcClient),
      alliance: new AllianceClient(rpcClient),
      book: new BookQueryClient(rpcClient),
      bridge: new BridgeQueryClient(rpcClient),
      broker: new BrokerQueryClient(rpcClient),
      coin: new CoinQueryClient(rpcClient),
      cdp: new CDPQueryClient(rpcClient),
      fee: new FeeQueryClient(rpcClient),
      inflation: new InflationQueryClient(rpcClient),
      insurance: new InsuranceQueryClient(rpcClient),
      leverage: new LeverageQueryClient(rpcClient),
      liquidation: new LiquidationQueryClient(rpcClient),
      liquiditypool: new LiquidityPoolQueryClient(rpcClient),
      market: new MarketQueryClient(rpcClient),
      marketstats: new MarketStatsQueryClient(rpcClient),
      misc: new MiscQueryClient(rpcClient),
      oracle: new OracleQueryClient(rpcClient),
      order: new OrderQueryClient(rpcClient),
      position: new PositionQueryClient(rpcClient),
      pricing: new PricingQueryClient(rpcClient),
      profile: new ProfileQueryClient(rpcClient),
      subaccount: new SubaccountQueryClient(rpcClient),
      headersync: new HeadersyncQueryClient(rpcClient),
      evmmerge: new EvmMergeQueryClient(rpcClient),
      evmbank: new EvmBankQueryClient(rpcClient),
      perpspool: new PerpspoolQueryClient(rpcClient),
      auth: new AuthQueryClient(rpcClient),
      bank: new BankQueryClient(rpcClient),
      nativeBank: new NativeBankQueryClient(rpcClient),
      distribution: new DistributionQueryClient(rpcClient),
      evidence: new EvidenceQueryClient(rpcClient),
      grant: new GrantQueryClient(rpcClient),
      feegrant: new FeeGrantQueryClient(rpcClient),
      group: new GroupQueryClient(rpcClient),
      gov: new GovQueryClient(rpcClient),
      mint: new MintQueryClient(rpcClient),
      params: new ParamsQueryClient(rpcClient),
      slashing: new SlashingQueryClient(rpcClient),
      staking: new StakingQueryClient(rpcClient),
      upgrade: new UpgradeQueryClient(rpcClient),
      cosmosTm: new CosmosTmClient(rpcClient),
      erc20: new ERC20QueryClient(rpcClient),

      ibc: {
        controller: new IBCInterchainControlQueryClient(rpcClient),
        host: new IBCInterchainHostQueryClient(rpcClient),
        transfer: new IBCTransferQueryClient(rpcClient),
        client: new IBCClientQueryClient(rpcClient),
        connection: new IBCConnectionQueryClient(rpcClient),
        channel: new IBCChannelQueryClient(rpcClient),
      },

      ethermint: {
        evm: new EthermintEVMQueryClient(rpcClient),
        feeMarket: new EthermintFeeMarketQueryClient(rpcClient),
      },
    }));

    return queryClient;
  }
}
