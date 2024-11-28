import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, ConvertEncType, generateAminoType } from "../utils";

const TxTypes: Record<string, string> = {
  CreatePool: "perpspool/CreatePool",
  UpdatePool: "perpspool/UpdatePool",
  DepositToPool: "perpspool/DepositToPool",
  RegisterToPool: "perpspool/RegisterToPool",
  DeregisterToPool: "perpspool/DeregisterToPool",
  WithdrawFromPool: "perpspool/WithdrawToPool",
  UpdateMarketConfig: "perpspool/UpdateMarketConfig",
};

const MsgCreatePool: AminoInit = {
  aminoType: TxTypes.CreatePool,
  valueMap: {},
};
const MsgUpdatePool: AminoInit = {
  aminoType: TxTypes.UpdatePool,
  valueMap: {
    poolId: ConvertEncType.Long,
  },
};

const MsgRegisterToPool: AminoInit = {
  aminoType: TxTypes.RegisterToPool,
  valueMap: {
    poolId: ConvertEncType.Long,
  },
};

const MsgDeregisterFromPool: AminoInit = {
  aminoType: TxTypes.DeregisterToPool,
  valueMap: {},
};

const MsgDepositToPool: AminoInit = {
  aminoType: TxTypes.DepositToPool,
  valueMap: {
    poolId: ConvertEncType.Long,
  },
};

const MsgWithdrawFromPool: AminoInit = {
  aminoType: TxTypes.WithdrawFromPool,
  valueMap: {
    poolId: ConvertEncType.Long,
  },
};

const PerpspoolAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgCreatePool]: generateAminoType(MsgCreatePool),
  [CarbonTxTypes.MsgUpdatePool]: generateAminoType(MsgUpdatePool),
  [CarbonTxTypes.MsgRegisterToPool]: generateAminoType(MsgRegisterToPool),
  [CarbonTxTypes.MsgDeregisterFromPool]: generateAminoType(MsgDeregisterFromPool),
  [CarbonTxTypes.MsgDepositToPool]: generateAminoType(MsgDepositToPool),
  [CarbonTxTypes.MsgWithdrawFromPool]: generateAminoType(MsgWithdrawFromPool),
};

export default PerpspoolAmino;
