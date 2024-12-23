import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, AminoProcess, AminoValueMap, ConvertEncType, generateAminoType } from "../utils";


type LiquidityPoolTxTypes =
  | 'CreatePool'
  | 'CreatePoolWithLiquidity'
  | 'AddLiquidity'
  | 'RemoveLiquidity'
  | 'StakePoolToken'
  | 'UnstakePoolToken'
  | 'ClaimPoolRewards'

const TxTypes: Record<LiquidityPoolTxTypes, string> = {
  CreatePool: "liquiditypool/CreatePool",
  CreatePoolWithLiquidity: "liquiditypool/CreatePoolWithLiquidity",
  AddLiquidity: "liquiditypool/AddLiquidity",
  RemoveLiquidity: "liquiditypool/RemoveLiquidity",
  StakePoolToken: "liquiditypool/StakePoolToken",
  UnstakePoolToken: "liquiditypool/UnstakePoolToken",
  ClaimPoolRewards: "liquiditypool/ClaimPoolRewards",
};

const MsgCreatePool: AminoInit = {
  aminoType: TxTypes.CreatePool,
  valueMap: {
    swapFee: ConvertEncType.Dec,
    tokenAWeight: ConvertEncType.Dec,
    tokenBWeight: ConvertEncType.Dec,
    ampBps: ConvertEncType.Long,
  },
};

const MsgCreatePoolWithLiquidity: AminoInit = {
  aminoType: TxTypes.CreatePoolWithLiquidity,
  valueMap: {
    tokenAWeight: ConvertEncType.Dec,
    tokenBWeight: ConvertEncType.Dec,
    swapFee: ConvertEncType.Dec,
    ampBps: ConvertEncType.Long,
  },
};

const MsgAddLiquidity: AminoInit = {
  aminoType: TxTypes.AddLiquidity,
  valueMap: {
    poolId: ConvertEncType.Long,
  },
};

const MsgRemoveLiquidity: AminoInit = {
  aminoType: TxTypes.RemoveLiquidity,
  valueMap: {
    poolId: ConvertEncType.Long,
  },
};

const MsgStakePoolToken: AminoInit = {
  aminoType: TxTypes.StakePoolToken,
  valueMap: {
    duration: ConvertEncType.Long,
  },
};

const MsgUnstakePoolToken: AminoInit = {
  aminoType: TxTypes.UnstakePoolToken,
  valueMap: {},
};

const MsgClaimPoolRewards: AminoInit = {
  aminoType: TxTypes.ClaimPoolRewards,
  valueMap: {
    poolId: ConvertEncType.Long,
  },
};

const commitTokensProcess: AminoProcess = {
  toAminoProcess: (amino: AminoValueMap, input: any) => {
    const newInput = input;
    if (input.duration.equals(0)) {
      delete newInput.duration;
    }
    return { amino, input: newInput };
  },
};

const LiquidityPoolAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgLiquiditypoolCreatePool]: generateAminoType(MsgCreatePool),
  [CarbonTxTypes.MsgCreatePoolWithLiquidity]: generateAminoType(MsgCreatePoolWithLiquidity),
  [CarbonTxTypes.MsgAddLiquidity]: generateAminoType(MsgAddLiquidity),
  [CarbonTxTypes.MsgRemoveLiquidity]: generateAminoType(MsgRemoveLiquidity),
  [CarbonTxTypes.MsgStakePoolToken]: generateAminoType(MsgStakePoolToken, commitTokensProcess),
  [CarbonTxTypes.MsgUnstakePoolToken]: generateAminoType(MsgUnstakePoolToken),
  [CarbonTxTypes.MsgClaimPoolRewards]: generateAminoType(MsgClaimPoolRewards),
};

export default LiquidityPoolAmino;
