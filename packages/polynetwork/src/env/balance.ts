import { Carbon } from "@carbon-sdk/CarbonSDK";

export interface TokensWithExternalBalance extends Carbon.Coin.Token {
  externalBalance: string;
};

export interface TokenInitInfo {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
};