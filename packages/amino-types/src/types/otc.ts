import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, ConvertEncType, generateAminoType } from "../utils";

const TxTypes: Record<string, string> = {
  MsgCreateRfq: "otc/CreateRfq",
  MsgCancelRfq: "otc/CancelRfq",
  MsgAcceptQuote: "otc/AcceptQuote",
};

const MsgCreateRfq: AminoInit = {
  aminoType: TxTypes.MsgCreateRfq,
  valueMap: {
    expiryTime: ConvertEncType.Date,
  },
};

const MsgCancelRfq: AminoInit = {
  aminoType: TxTypes.MsgCancelRfq,
  valueMap: {},
};

const MsgAcceptQuote: AminoInit = {
  aminoType: TxTypes.MsgAcceptQuote,
  valueMap: {},
};

const OtcAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgCreateRfq]: generateAminoType(MsgCreateRfq),
  [CarbonTxTypes.MsgCancelRfq]: generateAminoType(MsgCancelRfq),
  [CarbonTxTypes.MsgAcceptQuote]: generateAminoType(MsgAcceptQuote),
};

export default OtcAmino;
