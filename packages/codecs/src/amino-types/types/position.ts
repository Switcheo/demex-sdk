import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, generateAminoType } from "../utils";

const TxTypes: Record<string, string> = {
  SetMargin: "position/SetMargin",
};

const MsgSetMargin: AminoInit = {
  aminoType: TxTypes.SetMargin,
  valueMap: {},
};

const PositionAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgSetMargin]: generateAminoType(MsgSetMargin),
};

export default PositionAmino;
