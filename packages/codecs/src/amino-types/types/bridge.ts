import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, ConvertEncType, generateAminoType } from "../utils";


const TxTypes: Record<string, string> = {
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
