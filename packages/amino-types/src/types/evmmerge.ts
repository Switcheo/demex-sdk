import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, generateAminoType } from "../utils";

const TxTypes: Record<string, string> = {
  MergeAccount: "evmmerge/MsgMergeAccount",
};

const MsgMergeAccount: AminoInit = {
  aminoType: TxTypes.MergeAccount,
  valueMap: {},
};


const EvmMergeAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgMergeAccount]: generateAminoType(MsgMergeAccount),
};

export default EvmMergeAmino;
