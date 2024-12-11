import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs"
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, generateAminoType } from "../utils";


type BankTxTypes = 'Send'

const TxTypes: Record<BankTxTypes, string> = {
  Send: "cosmos-sdk/MsgSend",
};

const MsgSend: AminoInit = {
  aminoType: TxTypes.Send,
  valueMap: {},
};

const BankAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgSend]: generateAminoType(MsgSend),
};

export default BankAmino;
