import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, ConvertEncType, generateAminoType } from "../utils";




type MarketTxTypes = 'UpdateMarket' | 'SettleSpotMarket' | 'AddFeeTier' | 'RemoveFeeTier' | 'UpdateFeeTier' | 'SetStakeEquivalence'

const TxTypes: Record<MarketTxTypes, string> = {
  UpdateMarket: "market/UpdateMarket",
  SettleSpotMarket: "market/SettleSpotMarket",
  AddFeeTier: "market/AddFeeTier",
  RemoveFeeTier: "market/RemoveFeeTier",
  UpdateFeeTier: "market/UpdateFeeTier",
  SetStakeEquivalence: "market/SetStakeEquivalence",
};

const MsgUpdateMarket: AminoInit = {
  aminoType: TxTypes.UpdateMarket,
  valueMap: {
    marketParams: {
      tickSize: ConvertEncType.Dec,
      makerFee: ConvertEncType.Dec,
      takerFee: ConvertEncType.Dec,
      initialMarginBase: ConvertEncType.Dec,
      initialMarginStep: ConvertEncType.Dec,
      maintenanceMarginRatio: ConvertEncType.Dec,
      maxLiquidationOrderDuration: ConvertEncType.Duration,
      markPriceBand: ConvertEncType.NumToStr,
      lastPriceProtectedBand: ConvertEncType.NumToStr,
    },
  },
};

const MsgSettleSpotMarket: AminoInit = {
  aminoType: TxTypes.SettleSpotMarket,
  valueMap: {},
};

const MsgAddFeeTier: AminoInit = {
  aminoType: TxTypes.AddFeeTier,
  valueMap: {
    feeTier: {
      tradingFees: {
        makerFee: ConvertEncType.Dec,
        takerFee: ConvertEncType.Dec,
      },
    },
  },
}
const MsgRemoveFeeTier: AminoInit = {
  aminoType: TxTypes.RemoveFeeTier,
  valueMap: {},
}
const MsgUpdateFeeTier: AminoInit = {
  aminoType: TxTypes.UpdateFeeTier,
  valueMap: {
    makerFee: ConvertEncType.Dec,
    takerFee: ConvertEncType.Dec,
  },
}
const MsgSetStakeEquivalence: AminoInit = {
  aminoType: TxTypes.UpdateFeeTier,
  valueMap: {
    stakeEquivalence: {
      ratio: ConvertEncType.Dec,
    },
  },
}


const MarketAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgUpdateMarket]: generateAminoType(MsgUpdateMarket),
  [CarbonTxTypes.MsgSettleSpotMarket]: generateAminoType(MsgSettleSpotMarket),
  [CarbonTxTypes.MsgAddFeeTier]: generateAminoType(MsgAddFeeTier),
  [CarbonTxTypes.MsgRemoveFeeTier]: generateAminoType(MsgRemoveFeeTier),
  [CarbonTxTypes.MsgUpdateFeeTier]: generateAminoType(MsgUpdateFeeTier),
  [CarbonTxTypes.MsgSetStakeEquivalence]: generateAminoType(MsgSetStakeEquivalence),
};

export default MarketAmino;
