import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, generateAminoType } from "../utils";

const TxTypes: Record<string, string> = {
  InitiateLiquidation: "broker/InitiateLiquidation",
};

const MsgInitiateLiquidation: AminoInit = {
  aminoType: TxTypes.InitiateLiquidation,
  valueMap: {},
};

const BrokerAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgInitiateLiquidation]: generateAminoType(MsgInitiateLiquidation),
};

export default BrokerAmino;
