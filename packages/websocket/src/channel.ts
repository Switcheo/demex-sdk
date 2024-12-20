import {
  WsChannel,
  WsSubscribeAccountTradesAllParams,
  WsSubscribeAccountTradesByMarketParams,
  WsSubscribeTokenDebts,
  WsSubscribeAllTokenPrices,
  WsSubscribeBooksParams,
  WsSubscribeCandlesticksParams,
  WsSubscribeCDPBorrows,
  WsSubscribeCDPCollaterals,
  WsSubscribeCDPLiquidateCollaterals,
  WsSubscribeCommitmentParams,
  WsSubscribeLeveragesAllParams,
  WsSubscribeLeveragesByMarketParams,
  WsSubscribeMarketStatsAllParams,
  WsSubscribeMarketStatsByMarketParams,
  WsSubscribeOrdersAllParams,
  WsSubscribeOrdersByMarketParams,
  WsSubscribePoolsAllParams,
  WsSubscribePoolsByIdParams,
  WsSubscribePositionsAllParams,
  WsSubscribePositionsByMarketParams,
  WsSubscribeRecentTradesParams,
  WsSubscribeRewardDebts,
  WsSubscribeRewardSchemes,
  WsSubscribeTokenDebtByDenom,
  WsSubscribeTokenPrices,
  WsSubscribeWalletBalanceParams,
  WsSubscriptionParams,
  WsSubscribeCDPTokenSupply,
  WsSubscribeCDPTokenSupplyByDenom,
  WsSubscribeTokenSupplyByDenom,
  WsSubscribeMarketLiquidityUsageMultiplier as WsSubscribeMarketLiquidityUsageMultiplier,
} from "./types";

export const generateChannelId = (params: WsSubscriptionParams): string => {
  switch (params.channel) {
    case WsChannel.candlesticks: {
      const { channel, market_id, resolution } = params as WsSubscribeCandlesticksParams;
      return [channel, market_id, resolution].join(":");
    }
    case WsChannel.books: {
      const { channel, market_id } = params as WsSubscribeBooksParams;
      return [channel, market_id].join(":");
    }
    case WsChannel.recent_trades: {
      const { channel, market_id } = params as WsSubscribeRecentTradesParams;
      return [channel, market_id].join(":");
    }
    case WsChannel.orders: {
      const { channel, address } = params as WsSubscribeOrdersAllParams;
      return [channel, address].join(":");
    }
    case WsChannel.orders_by_market: {
      const { channel, market_id, address } = params as WsSubscribeOrdersByMarketParams;
      return [channel, market_id, address].join(":");
    }
    case WsChannel.balances: {
      const { channel, address } = params as WsSubscribeWalletBalanceParams;
      return [channel, address].join(":");
    }
    case WsChannel.account_trades: {
      const { channel, address } = params as WsSubscribeAccountTradesAllParams;
      return [channel, address].join(":");
    }
    case WsChannel.account_trades_by_market: {
      const { channel, market_id, address } = params as WsSubscribeAccountTradesByMarketParams;
      return [channel, market_id, address].join(":");
    }
    case WsChannel.market_stats: {
      const { channel } = params as WsSubscribeMarketStatsAllParams;
      return [channel].join(":");
    }
    case WsChannel.market_stats_by_market: {
      const { channel, market_id } = params as WsSubscribeMarketStatsByMarketParams;
      return [channel, market_id].join(":");
    }
    case WsChannel.leverages: {
      const { channel, address } = params as WsSubscribeLeveragesAllParams;
      return [channel, address].join(":");
    }
    case WsChannel.leverages_by_market: {
      const { channel, market_id, address } = params as WsSubscribeLeveragesByMarketParams;
      return [channel, market_id, address].join(":");
    }
    case WsChannel.positions: {
      const { channel, address } = params as WsSubscribePositionsAllParams;
      return [channel, address].join(":");
    }
    case WsChannel.positions_by_market: {
      const { channel, market_id, address } = params as WsSubscribePositionsByMarketParams;
      return [channel, market_id, address].join(":");
    }
    case WsChannel.pools: {
      const { channel } = params as WsSubscribePoolsAllParams;
      return [channel].join(":");
    }
    case WsChannel.pools_by_id: {
      const { channel, id } = params as WsSubscribePoolsByIdParams;
      return [channel, id].join(":");
    }
    case WsChannel.token_prices: {
      const { channel } = params as WsSubscribeAllTokenPrices;
      return [channel].join(":");
    }
    case WsChannel.token_prices_by_denom: {
      const { channel, denom } = params as WsSubscribeTokenPrices;
      return [channel, denom].join(":");
    }
    case WsChannel.commitments: {
      const { channel, address } = params as WsSubscribeCommitmentParams;
      return [channel, address].join(":");
    }
    case WsChannel.cdp_borrows: {
      const { channel, address } = params as WsSubscribeCDPBorrows;
      return [channel, address].join(":");
    }
    case WsChannel.cdp_collaterals: {
      const { channel, address } = params as WsSubscribeCDPCollaterals;
      return [channel, address].join(":");
    }
    case WsChannel.cdp_liquidate_collaterals: {
      const { channel } = params as WsSubscribeCDPLiquidateCollaterals;
      return [channel].join(":");
    }
    case WsChannel.cdp_token_debts: {
      const { channel } = params as WsSubscribeTokenDebts;
      return [channel].join(":");
    }
    case WsChannel.cdp_token_debts_by_denom: {
      const { channel, denom } = params as WsSubscribeTokenDebtByDenom;
      return [channel, denom].join(":");
    }
    case WsChannel.cdp_reward_schemes: {
      const { channel } = params as WsSubscribeRewardSchemes;
      return [channel].join(":");
    }
    case WsChannel.cdp_reward_debts: {
      const { channel, address } = params as WsSubscribeRewardDebts;
      return [channel, address].join(":");
    }
    case WsChannel.cdp_token_supply: {
      const { channel } = params as WsSubscribeCDPTokenSupply;
      return [channel].join(":");
    }
    case WsChannel.cdp_token_supply_by_denom: {
      const { channel, denom } = params as WsSubscribeCDPTokenSupplyByDenom;
      return [channel, denom].join(":");
    }
    case WsChannel.token_supply_by_denom: {
      const { channel, denom } = params as WsSubscribeTokenSupplyByDenom;
      return [channel, denom].join(":");
    }
    case WsChannel.market_liquidity_usage_multiplier: {
      const { channel } = params as WsSubscribeMarketLiquidityUsageMultiplier;
      return [channel].join(":");
    }
    default:
      throw new Error(`invalid subscription channel: ${params.channel}`);
  }
};

export const parseChannelId = (rawChannelId: string): WsSubscriptionParams => {
  const [channel, param0, param1] = rawChannelId.split(":");
  switch (channel) {
    case WsChannel.candlesticks:
      return {
        channel,
        market_id: param0,
        resolution: param1,
      } as WsSubscribeCandlesticksParams;
    case WsChannel.books:
      return {
        channel,
        market_id: param0,
      } as WsSubscribeBooksParams;
    case WsChannel.recent_trades:
      return {
        channel,
        market_id: param0,
      } as WsSubscribeRecentTradesParams;
    case WsChannel.orders:
      return {
        channel,
        address: param0,
      } as WsSubscribeOrdersAllParams;
    case WsChannel.orders_by_market:
      return {
        channel,
        market_id: param0,
        address: param1,
      } as WsSubscribeOrdersByMarketParams;
    case WsChannel.balances:
      return {
        channel,
        address: param0,
      } as WsSubscribeWalletBalanceParams;
    case WsChannel.account_trades:
      return {
        channel,
        address: param0,
      } as WsSubscribeAccountTradesAllParams;
    case WsChannel.account_trades_by_market:
      return {
        channel,
        market_id: param0,
        address: param1,
      } as WsSubscribeAccountTradesByMarketParams;
    case WsChannel.market_stats:
      return {
        channel,
      } as WsSubscribeMarketStatsAllParams;
    case WsChannel.market_stats_by_market:
      return {
        channel,
        market_id: param0,
      } as WsSubscribeMarketStatsByMarketParams;
    case WsChannel.leverages:
      return {
        channel,
        address: param0,
      } as WsSubscribeLeveragesAllParams;
    case WsChannel.leverages_by_market:
      return {
        channel,
        market_id: param0,
        address: param1,
      } as WsSubscribeLeveragesByMarketParams;
    case WsChannel.positions:
      return {
        channel,
        address: param0,
      } as WsSubscribePositionsAllParams;
    case WsChannel.positions_by_market:
      return {
        channel,
        market_id: param0,
        address: param1,
      } as WsSubscribePositionsByMarketParams;
    case WsChannel.pools:
      return {
        channel,
      } as WsSubscribePoolsAllParams;
    case WsChannel.pools_by_id:
      return {
        channel,
        id: param0,
      } as WsSubscribePoolsByIdParams;
    case WsChannel.commitments:
      return {
        channel,
        address: param0,
      } as WsSubscribeCommitmentParams;
    case WsChannel.token_prices:
      return {
        channel,
      } as WsSubscribeAllTokenPrices;
    case WsChannel.token_prices_by_denom:
      return {
        channel,
        denom: param0,
      } as WsSubscribeTokenPrices;
    case WsChannel.cdp_borrows:
      return {
        channel,
        address: param0,
      } as WsSubscribeCDPBorrows;
    case WsChannel.cdp_collaterals:
      return {
        channel,
        address: param0,
      } as WsSubscribeCDPCollaterals;
    case WsChannel.cdp_liquidate_collaterals:
      return {
        channel,
      } as WsSubscribeCDPLiquidateCollaterals;
    case WsChannel.cdp_token_debts:
      return {
        channel,
      } as WsSubscribeTokenDebts;
    case WsChannel.cdp_token_debts_by_denom:
      return {
        channel,
        denom: param0,
      } as WsSubscribeTokenDebtByDenom;
    case WsChannel.cdp_reward_schemes:
      return {
        channel,
      } as WsSubscribeRewardSchemes;
    case WsChannel.cdp_reward_debts:
      return {
        channel,
        address: param0,
      } as WsSubscribeRewardDebts;
    case WsChannel.cdp_token_supply:
      return {
        channel,
      } as WsSubscribeCDPTokenSupply;
    case WsChannel.cdp_token_supply_by_denom:
      return {
        channel,
        denom: param0,
      } as WsSubscribeCDPTokenSupplyByDenom;
    case WsChannel.token_supply_by_denom:
      return {
        channel,
        denom: param0,
      } as WsSubscribeTokenSupplyByDenom;
    case WsChannel.market_liquidity_usage_multiplier:
      return {
        channel,
      } as WsSubscribeMarketLiquidityUsageMultiplier;
    default:
      throw new Error("Error parsing channelId");
  }
};
