import { Carbon } from "@demex-sdk/codecs";

export interface TokensWithExternalBalance extends Carbon.Coin.Token {
  externalBalance: string;
};

export interface TokenInitInfo {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
};