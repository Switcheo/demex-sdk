import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, ConvertEncType, generateAminoType } from "../utils";

const TxTypes: Record<string, string> = {
  SetLeverage: "leverage/SetLeverage",
};

const MsgSetLeverage: AminoInit = {
  aminoType: TxTypes.SetLeverage,
  valueMap: {
    leverage: ConvertEncType.Dec,
  },
};

const LeverageAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgSetLeverage]: generateAminoType(MsgSetLeverage),
};

export default LeverageAmino;
