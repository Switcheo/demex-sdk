import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, ConvertEncType, generateAminoType } from "../utils";



type BridgeTxTypes = 'WithdrawTokenTx'

const TxTypes: Record<BridgeTxTypes, string> = {
  WithdrawTokenTx: "bridge/MsgWithdrawToken",
};

const MsgWithdrawToken: AminoInit = {
  aminoType: TxTypes.WithdrawTokenTx,
  valueMap: {
    expiryDuration: ConvertEncType.Duration,
  },
};


const BridgeAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgWithdrawToken]: generateAminoType(MsgWithdrawToken),
};

export default BridgeAmino;
