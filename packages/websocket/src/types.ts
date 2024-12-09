export enum WsChannel {
  candlesticks = "candlesticks",
  books = "books",
  recent_trades = "recent_trades",
  orders = "orders",
  orders_by_market = "orders_by_market",
  balances = "balances",
  account_trades = "account_trades",
  account_trades_by_market = "account_trades_by_market",
  market_stats = "market_stats",
  market_stats_by_market = "market_stats_by_market",
  leverages = "leverages",
  leverages_by_market = "leverages_by_market",
  positions = "positions",
  positions_by_market = "positions_by_market",
  pools = "pools",
  pools_by_id = "pools_by_id",
  token_prices = "token_prices",
  token_prices_by_denom = "token_prices_by_denom",
  commitments = "commitments",
  cdp_borrows = "cdp_borrows",
  cdp_collaterals = "cdp_collaterals",
  cdp_liquidate_collaterals = "cdp_liquidate_collaterals",
  cdp_token_debts = "cdp_token_debts",
  cdp_token_debts_by_denom = "cdp_token_debts_by_denom",
  cdp_reward_schemes = "cdp_reward_schemes",
  cdp_reward_debts = "cdp_reward_debts",
  cdp_token_supply = "cdp_token_supply",
  cdp_token_supply_by_denom = "cdp_token_supply_by_denom",
  token_supply_by_denom = "token_supply_by_denom",
  market_liquidity_usage_multiplier = "market_liquidity_usage_multiplier",
}
export enum WsUpdateType {
  FullState = "full_state",
  Delta = "delta",
}

export interface WsSubscribeParams {
  channel: WsChannel;
}

export interface WsSubscribeCandlesticksParams extends WsSubscribeParams {
  market_id: string;
  resolution: string;
  subscribeUID: string;
}

export interface WsSubscribeBooksParams extends WsSubscribeParams {
  market_id: string;
}

export interface WsSubscribeRecentTradesParams extends WsSubscribeParams {
  market_id: string;
}

export interface WsSubscribeOrdersAllParams extends WsSubscribeParams {
  address: string;
}

export interface WsSubscribeOrdersByMarketParams extends WsSubscribeParams {
  market_id: string;
  address: string;
}

export interface WsSubscribeWalletBalanceParams extends WsSubscribeParams {
  address: string;
}

export interface WsSubscribeAccountTradesAllParams extends WsSubscribeParams {
  address: string;
}

export interface WsSubscribeAccountTradesByMarketParams extends WsSubscribeParams {
  market_id: string;
  address: string;
}

export interface WsSubscribeMarketStatsAllParams extends WsSubscribeParams { }

export interface WsSubscribeMarketStatsByMarketParams extends WsSubscribeParams {
  market_id: string;
}

export interface WsSubscribeLeveragesAllParams extends WsSubscribeParams {
  address: string;
}

export interface WsSubscribeLeveragesByMarketParams extends WsSubscribeParams {
  market_id: string;
  address: string;
}

export interface WsSubscribePositionsAllParams extends WsSubscribeParams {
  address: string;
}

export interface WsSubscribePositionsByMarketParams extends WsSubscribeParams {
  market_id: string;
  address: string;
}

export interface WsSubscribePoolsAllParams extends WsSubscribeParams { }

export interface WsSubscribePoolsByIdParams extends WsSubscribeParams {
  id: string;
}

export interface WsSubscribeCommitmentParams extends WsSubscribeParams {
  address: string;
}

export interface WsUnsubscribeCandlesticksParams extends WsSubscribeParams {
  market_id: string;
  resolution: string;
}

export interface WsSubscribeCDPBorrows extends WsSubscribeParams {
  address: string;
}

export interface WsSubscribeCDPCollaterals extends WsSubscribeParams {
  address: string;
}

export interface WsSubscribeCDPLiquidateCollaterals extends WsSubscribeParams { }

export interface WsSubscribeTokenDebts extends WsSubscribeParams { }

export interface WsSubscribeTokenDebtByDenom extends WsSubscribeParams {
  denom: string;
}

export interface WsSubscribeRewardSchemes extends WsSubscribeParams { }

export interface WsSubscribeRewardDebts extends WsSubscribeParams {
  address?: string;
}

export interface WsSubscribeTokenPrices extends WsSubscribeParams {
  denom: string;
}

export interface WsSubscribeAllTokenPrices extends WsSubscribeParams { }
export interface WsSubscribeCDPTokenSupplyByDenom extends WsSubscribeParams {
  denom: string;
}

export interface WsSubscribeCDPTokenSupply extends WsSubscribeParams { }

export interface WsSubscribeTokenSupplyByDenom extends WsSubscribeParams {
  denom: string;
}

export interface WsSubscribeMarketLiquidityUsageMultiplier extends WsSubscribeParams { }

export type WsSubscriptionParams =
  | WsSubscribeCandlesticksParams
  | WsSubscribeBooksParams
  | WsSubscribeRecentTradesParams
  | WsSubscribeOrdersAllParams
  | WsSubscribeOrdersByMarketParams
  | WsSubscribeWalletBalanceParams
  | WsSubscribeAccountTradesAllParams
  | WsSubscribeAccountTradesByMarketParams
  | WsSubscribeMarketStatsAllParams
  | WsSubscribeMarketStatsByMarketParams
  | WsSubscribeLeveragesAllParams
  | WsSubscribeLeveragesByMarketParams
  | WsSubscribePositionsAllParams
  | WsSubscribePositionsByMarketParams
  | WsSubscribePoolsAllParams
  | WsSubscribePoolsByIdParams
  | WsSubscribeTokenPrices
  | WsSubscribeAllTokenPrices
  | WsSubscribeCommitmentParams
  | WsSubscribeCDPBorrows
  | WsSubscribeCDPCollaterals
  | WsSubscribeCDPLiquidateCollaterals
  | WsSubscribeTokenDebts
  | WsSubscribeTokenDebtByDenom
  | WsSubscribeRewardSchemes
  | WsSubscribeRewardDebts
  | WsSubscribeCDPTokenSupply
  | WsSubscribeCDPTokenSupplyByDenom
  | WsSubscribeTokenSupplyByDenom
  | WsSubscribeMarketLiquidityUsageMultiplier
  | WsUnsubscribeCandlesticksParams
