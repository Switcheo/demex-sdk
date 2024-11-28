import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, generateAminoType } from "../utils";

const TxTypes: Record<string, string> = {
  Delegate: "cosmos-sdk/MsgDelegate",
  Undelegate: "cosmos-sdk/MsgUndelegate",
  BeginRedelegate: "cosmos-sdk/MsgBeginRedelegate",
  WithdrawDelegationReward: "cosmos-sdk/MsgWithdrawDelegationReward",
};

const MsgDelegate: AminoInit = {
  aminoType: TxTypes.Delegate,
  valueMap: {},
};

const MsgUndelegate: AminoInit = {
  aminoType: TxTypes.Undelegate,
  valueMap: {},
};

const MsgBeginRedelegate: AminoInit = {
  aminoType: TxTypes.BeginRedelegate,
  valueMap: {},
};

const MsgWithdrawDelegatorReward: AminoInit = {
  aminoType: TxTypes.WithdrawDelegationReward,
  valueMap: {},
};

const StakingAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgDelegate]: generateAminoType(MsgDelegate),
  [CarbonTxTypes.MsgUndelegate]: generateAminoType(MsgUndelegate),
  [CarbonTxTypes.MsgBeginRedelegate]: generateAminoType(MsgBeginRedelegate),
  [CarbonTxTypes.MsgWithdrawDelegatorReward]: generateAminoType(MsgWithdrawDelegatorReward),
};

export default StakingAmino;
