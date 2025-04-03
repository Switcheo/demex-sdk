import BigNumber from "bignumber.js";

export const DEFAULT_GAS_DENOM = "swth";
export const DEFAULT_GAS_COST_TX_TYPE = "default_fee";
export const DEFAULT_TX_TIMEOUT_BLOCKS = 35; // ~1min at 1.7s/blk

export const DEFAULT_GAS = new BigNumber(1e8);
