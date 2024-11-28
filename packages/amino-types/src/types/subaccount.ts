import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, generateAminoType } from "../utils";

const TxTypes: Record<string, string> = {
  CreateSubAccount: "subaccount/CreateSubAccount",
  ActivateSubAccount: "subaccount/ActivateSubAccount",
  RemoveSubAccount: "subaccount/RemoveSubAccount",
};

const MsgCreateSubAccount: AminoInit = {
  aminoType: TxTypes.CreateSubAccount,
  valueMap: {},
};

const MsgActivateSubAccount: AminoInit = {
  aminoType: TxTypes.ActivateSubAccount,
  valueMap: {},
};

const MsgRemoveSubAccount: AminoInit = {
  aminoType: TxTypes.RemoveSubAccount,
  valueMap: {},
};

const SubAccountAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgCreateSubAccount]: generateAminoType(MsgCreateSubAccount),
  [CarbonTxTypes.MsgActivateSubAccount]: generateAminoType(MsgActivateSubAccount),
  [CarbonTxTypes.MsgRemoveSubAccount]: generateAminoType(MsgRemoveSubAccount),
};

export default SubAccountAmino;
