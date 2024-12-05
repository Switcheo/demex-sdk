import { AminoConverter } from "@cosmjs/stargate";
import { TxTypes } from "@demex-sdk/codecs";
import { AminoInit, ConvertEncType, generateAminoType } from "../utils";

const _MsgGroupVote: AminoInit = {
  aminoType: "cosmos-sdk/group/MsgVote",
  valueMap: {
    proposalId: ConvertEncType.Long,
  },
};


const _MsgExec: AminoInit = {
  aminoType: "cosmos-sdk/group/MsgExec",
  valueMap: {
    proposalId: ConvertEncType.Long,
  },
};

const aminoMap: Record<string, AminoConverter> = {
  [TxTypes.MsgGroupVote]: generateAminoType(_MsgGroupVote),
  [TxTypes.MsgGroupExec]: generateAminoType(_MsgExec),
};

export default aminoMap;
