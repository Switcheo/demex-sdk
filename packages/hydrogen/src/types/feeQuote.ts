export interface GetFeeQuoteRequest {
  token_denom: string;
  fee_denoms?: string[]
}

export interface DenomFeeQuote {
  denom: string,
  withdrawal_fee: string,
  deposit_fee: string,
  create_wallet_fee: string
}
export interface GetFeeQuoteResponse {
  id: number
  token_denom: string
  blockchain: string
  create_wallet_fee: string
  deposit_fee: string
  withdrawal_fee: string
  created_at: Date
  expires_at: Date
  other_token_fees?: DenomFeeQuote[]
}
