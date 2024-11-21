import BigNumber from "bignumber.js";

export const BN_ZERO = new BigNumber(0);

export const parseBN = (input?: string | BigNumber | number | null, defaultValue?: BigNumber) => {
  if (!input && input !== 0) return defaultValue;
  const result = BigNumber.isBigNumber(input) ? input : new BigNumber(input);
  if (!result.isFinite() || result.isNaN()) return defaultValue;

  return result;
};

export const bnOrZero = (input?: string | BigNumber | number | null, defaultValue: BigNumber = BN_ZERO) => {
  return parseBN(input, defaultValue)!;
};
