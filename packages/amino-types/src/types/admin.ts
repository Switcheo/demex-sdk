import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, ConvertEncType, generateAminoType } from "../utils";

type AdminTxTypes =
  | 'CreateOracle'
  | 'BindToken'
  | 'CreateToken'
  | 'LinkToken'
  | 'SyncToken'
  | 'CreateMarket'
  | 'CreateVaultType'
  | 'ChangeSwapFee'
  | 'SetRewardsWeights'
  | 'SetRewardCurve'
  | 'SetCommitmentCurve'
  | 'UpdatePool'
  | 'SetTradingFlag'
  | 'SetMsgGasCost'
  | 'SetMinGasPrice'
  | 'RemoveMsgGasCost'
  | 'RemoveMinGasPrice'
  | 'CreateValidator'
  | 'EditValidator'
  | 'AddRateStrategy'
  | 'UpdateRateStrategy'
  | 'RemoveRateStrategy'
  | 'AddAsset'
  | 'UpdateAsset'
  | 'SetLiquidationFee'
  | 'SetInterestFee'
  | 'SetStablecoinInterestRate'
  | 'SetCompleteLiquidationThreshold'
  | 'SetMinimumCloseFactor'
  | 'SetSmallLiquidationSize';

const TxTypes: Record<AdminTxTypes, string> = {
  CreateOracle: "oracle/CreateOracle",
  BindToken: "carbon/MsgBindToken",
  CreateToken: "carbon/MsgCreateToken",
  LinkToken: "carbon/MsgLinkToken",
  SyncToken: "carbon/MsgSyncToken",
  CreateMarket: "market/CreateMarket",
  CreateVaultType: "cdp/CreateVaultType",
  ChangeSwapFee: "liquiditypool/ChangeSwapFee",
  SetRewardsWeights: "liquiditypool/SetRewardsWeights",
  SetRewardCurve: "liquiditypool/SetRewardCurve",
  SetCommitmentCurve: "liquiditypool/SetCommitmentCurve",
  UpdatePool: "liquiditypool/UpdatePool",
  SetTradingFlag: "order/SetTradingFlag",
  SetMsgGasCost: "fee/SetMsgGasCost",
  SetMinGasPrice: "fee/SetMinGasPrice",
  RemoveMsgGasCost: "fee/RemoveMsgGasCost",
  RemoveMinGasPrice: "fee/RemoveMinGasPrice",
  CreateValidator: "cosmos-sdk/MsgCreateValidator",
  EditValidator: "cosmos-sdk/MsgEditValidator",
  AddRateStrategy: "cdp/AddRateStrategy",
  UpdateRateStrategy: "cdp/UpdateRateStrategy",
  RemoveRateStrategy: "cdp/RemoveRateStrategy",
  AddAsset: "cdp/AddAsset",
  UpdateAsset: "cdp/UpdateAsset",
  SetLiquidationFee: "cdp/SetLiquidationFee",
  SetInterestFee: "cdp/SetInterestFee",
  SetStablecoinInterestRate: "cdp/SetStablecoinInterestRate",
  SetCompleteLiquidationThreshold: "cdp/SetCompleteLiquidationThreshold",
  SetMinimumCloseFactor: "cdp/SetMinimumCloseFactor",
  SetSmallLiquidationSize: "cdp/SetSmallLiquidationSize",
};

const MsgCreateOracle: AminoInit = {
  aminoType: TxTypes.CreateOracle,
  valueMap: {
    createOracleParams: {
      minTurnoutPercentage: ConvertEncType.Long,
      maxResultAge: ConvertEncType.Long,
      resolution: ConvertEncType.Long,
    },
  },
};

const MsgBindToken: AminoInit = {
  aminoType: TxTypes.BindToken,
  valueMap: {},
};

const MsgCreateToken: AminoInit = {
  aminoType: TxTypes.CreateToken,
  valueMap: {
    createTokenParams: {
      decimals: ConvertEncType.Long,
      chainId: ConvertEncType.Long,
      bridgeId: ConvertEncType.Long,
    },
  },
};

const MsgLinkToken: AminoInit = {
  aminoType: TxTypes.LinkToken,
  valueMap: {},
};

const MsgSyncToken: AminoInit = {
  aminoType: TxTypes.SyncToken,
  valueMap: {},
};

const MsgCreateMarket: AminoInit = {
  aminoType: TxTypes.CreateMarket,
  valueMap: {
    expiryTime: ConvertEncType.Date,
    currentBasePriceUsd: ConvertEncType.Dec,
    currentQuotePriceUsd: ConvertEncType.Dec,
  },
};

const MsgUpdatePool: AminoInit = {
  aminoType: TxTypes.ChangeSwapFee,
  valueMap: {
    updatePoolParams: {
      poolId: ConvertEncType.Long,
      swapFee: ConvertEncType.Dec,
      numQuotes: ConvertEncType.Long,
    },
  },
};

const MsgSetRewardsWeights: AminoInit = {
  aminoType: TxTypes.SetRewardsWeights,
  valueMap: {
    setRewardsWeightsParams: {
      poolId: ConvertEncType.Long,
    },
  },
};

const MsgSetRewardCurve: AminoInit = {
  aminoType: TxTypes.SetRewardCurve,
  valueMap: {
    setRewardCurveParams: {
      startTime: ConvertEncType.Date,
      reductionIntervalSeconds: ConvertEncType.Long,
    },
  },
};

const MsgSetCommitmentCurve: AminoInit = {
  aminoType: TxTypes.SetCommitmentCurve,
  valueMap: {
    setCommitmentCurveParams: {
      maxDuration: ConvertEncType.Long,
    },
  },
};

const MsgSetTradingFlag: AminoInit = {
  aminoType: TxTypes.SetTradingFlag,
  valueMap: {},
};

const MsgSetGasCost: AminoInit = {
  aminoType: TxTypes.SetMsgGasCost,
  valueMap: {},
};

const MsgSetMinGasPrice: AminoInit = {
  aminoType: TxTypes.SetMinGasPrice,
  valueMap: {},
};

const MsgRemoveGasCost: AminoInit = {
  aminoType: TxTypes.RemoveMsgGasCost,
  valueMap: {},
};

const MsgRemoveMinGasPrice: AminoInit = {
  aminoType: TxTypes.RemoveMinGasPrice,
  valueMap: {},
};

const MsgCreateValidator: AminoInit = {
  aminoType: TxTypes.CreateValidator,
  valueMap: {
    commission: {
      rate: ConvertEncType.Dec,
      maxRate: ConvertEncType.Dec,
      maxChangeRate: ConvertEncType.Dec,
    },
  },
};

const MsgEditValidator: AminoInit = {
  aminoType: TxTypes.EditValidator,
  valueMap: {
    commissionRate: ConvertEncType.Dec,
  },
};

const MsgAddRateStrategy: AminoInit = {
  aminoType: TxTypes.AddRateStrategy,
  valueMap: {},
};

const MsgUpdateRateStrategy: AminoInit = {
  aminoType: TxTypes.UpdateRateStrategy,
  valueMap: {},
};

const MsgRemoveRateStrategy: AminoInit = {
  aminoType: TxTypes.RemoveRateStrategy,
  valueMap: {},
};

const MsgAddAsset: AminoInit = {
  aminoType: TxTypes.AddAsset,
  valueMap: {},
};

const MsgUpdateAsset: AminoInit = {
  aminoType: TxTypes.UpdateAsset,
  valueMap: {},
};

const MsgSetLiquidationFee: AminoInit = {
  aminoType: TxTypes.SetLiquidationFee,
  valueMap: {},
};

const MsgSetInterestFee: AminoInit = {
  aminoType: TxTypes.SetInterestFee,
  valueMap: {},
};

const MsgSetCompleteLiquidationThreshold: AminoInit = {
  aminoType: TxTypes.SetCompleteLiquidationThreshold,
  valueMap: {
    completeLiquidationThreshold: ConvertEncType.Dec,
  },
};

const MsgSetMinimumCloseFactor: AminoInit = {
  aminoType: TxTypes.SetMinimumCloseFactor,
  valueMap: {
    minimumCloseFactor: ConvertEncType.Dec,
  },
};

const MsgSetSmallLiquidationSize: AminoInit = {
  aminoType: TxTypes.SetSmallLiquidationSize,
  valueMap: {
    smallLiquidationSize: ConvertEncType.Dec,
  },
};

const AdminAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgCreateOracle]: generateAminoType(MsgCreateOracle),
  [CarbonTxTypes.MsgBindToken]: generateAminoType(MsgBindToken),
  [CarbonTxTypes.MsgCreateToken]: generateAminoType(MsgCreateToken),
  [CarbonTxTypes.MsgLinkToken]: generateAminoType(MsgLinkToken),
  [CarbonTxTypes.MsgSyncToken]: generateAminoType(MsgSyncToken),
  [CarbonTxTypes.MsgCreateMarket]: generateAminoType(MsgCreateMarket),
  [CarbonTxTypes.MsgUpdatePool]: generateAminoType(MsgUpdatePool),
  [CarbonTxTypes.MsgSetRewardsWeights]: generateAminoType(MsgSetRewardsWeights),
  [CarbonTxTypes.MsgSetRewardCurve]: generateAminoType(MsgSetRewardCurve),
  [CarbonTxTypes.MsgSetCommitmentCurve]: generateAminoType(MsgSetCommitmentCurve),
  [CarbonTxTypes.MsgSetTradingFlag]: generateAminoType(MsgSetTradingFlag),
  [CarbonTxTypes.MsgSetGasCost]: generateAminoType(MsgSetGasCost),
  [CarbonTxTypes.MsgSetMinGasPrice]: generateAminoType(MsgSetMinGasPrice),
  [CarbonTxTypes.MsgRemoveGasCost]: generateAminoType(MsgRemoveGasCost),
  [CarbonTxTypes.MsgRemoveMinGasPrice]: generateAminoType(MsgRemoveMinGasPrice),
  [CarbonTxTypes.MsgCreateValidator]: generateAminoType(MsgCreateValidator),
  [CarbonTxTypes.MsgEditValidator]: generateAminoType(MsgEditValidator),
  [CarbonTxTypes.MsgAddRateStrategy]: generateAminoType(MsgAddRateStrategy),
  [CarbonTxTypes.MsgUpdateRateStrategy]: generateAminoType(MsgUpdateRateStrategy),
  [CarbonTxTypes.MsgRemoveRateStrategy]: generateAminoType(MsgRemoveRateStrategy),
  [CarbonTxTypes.MsgAddAsset]: generateAminoType(MsgAddAsset),
  [CarbonTxTypes.MsgUpdateAsset]: generateAminoType(MsgUpdateAsset),
  [CarbonTxTypes.MsgSetLiquidationFee]: generateAminoType(MsgSetLiquidationFee),
  [CarbonTxTypes.MsgSetInterestFee]: generateAminoType(MsgSetInterestFee),
  [CarbonTxTypes.MsgSetCompleteLiquidationThreshold]: generateAminoType(MsgSetCompleteLiquidationThreshold),
  [CarbonTxTypes.MsgSetMinimumCloseFactor]: generateAminoType(MsgSetMinimumCloseFactor),
  [CarbonTxTypes.MsgSetSmallLiquidationSize]: generateAminoType(MsgSetSmallLiquidationSize),
};

export default AdminAmino;
