import { BN_ZERO, DEFAULT_GAS_DENOM, DEFAULT_GAS_COST_TX_TYPE } from "@demex-sdk/core";
import BigNumber from "bignumber.js";

class GasFee {
  constructor(
    public readonly txGasCosts: Record<string, BigNumber>,
    public readonly txGasPrices: Record<string, BigNumber>,
    public readonly defaultFeeDenom = DEFAULT_GAS_DENOM,
  ) { }

  public getFee(msgTypeUrl: string, denom: string = DEFAULT_GAS_DENOM): BigNumber | null {
    const minGasPrice = this.getGasPrice(denom);

    if (!minGasPrice) return null;

    const msgGasCost = this.getGasCost(msgTypeUrl);
    return msgGasCost.times(minGasPrice);
  }

  public getGasPrice(denom: string): BigNumber | null {
    const gasPrice = this.txGasPrices[denom];
    if (!gasPrice) {
      console.warn("denom not supported for paying gas", denom);
    }
    return gasPrice ?? null;
  }

  public getGasCost(msgTypeUrl: string): BigNumber {
    return this.txGasCosts[msgTypeUrl] ?? this.txGasCosts[DEFAULT_GAS_COST_TX_TYPE] ?? BN_ZERO;
  }

}

export default GasFee;
