import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, generateAminoType } from "../utils";



type FeeMarketTxTypes = 'UpdateParams'

const TxTypes: Record<FeeMarketTxTypes, string> = {
  UpdateParams: "ethermint/feemarket/MsgUpdateParams",
};

const MsgUpdateParams: AminoInit = {
  aminoType: TxTypes.UpdateParams,
  valueMap: {},
};


const FeeMarketAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgUpdateParams]: generateAminoType(MsgUpdateParams),
};

export default FeeMarketAmino;
