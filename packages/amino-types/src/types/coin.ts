import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, generateAminoType } from "../utils";

type CoinTxTypes = 'MintToken' | 'Withdraw' | 'DepositToGroup' | 'WithdrawFromGroup'

const TxTypes: Record<CoinTxTypes, string> = {
  MintToken: "carbon/MsgMintToken",
  Withdraw: "carbon/MsgWithdraw",
  DepositToGroup: "coin/DepositToGroup",
  WithdrawFromGroup: "coin/WithdrawFromGroup",
};

const MsgWithdraw: AminoInit = {
  aminoType: TxTypes.Withdraw,
  valueMap: {},
};

const MsgMintToken: AminoInit = {
  aminoType: TxTypes.MintToken,
  valueMap: {},
};

const MsgDepositToGroup: AminoInit = {
  aminoType: TxTypes.DepositToGroup,
  valueMap: {},
}

const MsgWithdrawFromGroup: AminoInit = {
  aminoType: TxTypes.WithdrawFromGroup,
  valueMap: {},
}

const CoinAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgWithdraw]: generateAminoType(MsgWithdraw),
  [CarbonTxTypes.MsgMintToken]: generateAminoType(MsgMintToken),
  [CarbonTxTypes.MsgDepositToGroup]: generateAminoType(MsgDepositToGroup),
  [CarbonTxTypes.MsgWithdrawFromGroup]: generateAminoType(MsgWithdrawFromGroup),
};

export default CoinAmino;
