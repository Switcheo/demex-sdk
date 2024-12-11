import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import Long from "long";
import { AminoInit, AminoProcess, AminoValueMap, ConvertEncType, generateAminoType } from "../utils";



type IbcTxTypes = 'Transfer'

const TxTypes: Record<IbcTxTypes, string> = {
  Transfer: "cosmos-sdk/MsgTransfer",
};

const MsgTransfer: AminoInit = {
  aminoType: TxTypes.Transfer,
  valueMap: {
    timeoutHeight: {
      revisionHeight: ConvertEncType.Long,
      revisionNumber: ConvertEncType.Long,
    },
    timeoutTimestamp: ConvertEncType.Long,
  },
};

const pruneTransferProcess: AminoProcess = {
  toAminoProcess: (amino: AminoValueMap, input: any) => {
    const newInput = input;
    if (Long.isLong(input.timeoutTimestamp) && new Long(0).eq(input.timeoutTimestamp)) {
      delete newInput.timeoutTimestamp;
    }
    if (Long.isLong(input.timeoutHeight?.revisionNumber) && new Long(0).eq(input.timeoutHeight?.revisionNumber)) {
      delete newInput.timeoutHeight?.revisionNumber;
    }
    return { amino, input: newInput };
  },
  fromAminoProcess: (amino: AminoValueMap, input: any) => {
    const newInput = input;
    return { amino, input: newInput };
  },
};

const IbcAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgTransfer]: generateAminoType(MsgTransfer, pruneTransferProcess),
};

export default IbcAmino;
