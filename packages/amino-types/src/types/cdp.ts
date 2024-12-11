import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, ConvertEncType, generateAminoType } from "../utils";

type CdpTxTypes =
  | 'SupplyAsset'
  | 'WithdrawAsset'
  | 'LockCollateral'
  | 'UnlockCollateral'
  | 'BorrowAsset'
  | 'RepayAsset'
  | 'SupplyAssetAndLockCollateral'
  | 'UnlockCollateralAndWithdrawAsset'
  | 'LiquidateCollateral'
  | 'MintStablecoin'
  | 'ReturnStablecoin'
  | 'CreateRewardScheme'
  | 'UpdateRewardScheme'
  | 'SetStablecoinMintCap'
  | 'SetStalePriceGracePeriod'
  | 'SetCdpPaused'
  | 'ClaimRewards'
  | 'AddEModeCategory'
  | 'UpdateEModeCategory'
  | 'SetAccountEMode'
  | 'RemoveAccountEMode';

const TxTypes: Record<CdpTxTypes, string> = {
  SupplyAsset: "cdp/SupplyAsset",
  WithdrawAsset: "cdp/WithdrawAsset",
  LockCollateral: "cdp/LockCollateral",
  UnlockCollateral: "cdp/UnlockCollateral",
  BorrowAsset: "cdp/BorrowAsset",
  RepayAsset: "cdp/RepayAsset",
  SupplyAssetAndLockCollateral: "cdp/SupplyAssetAndLockCollateral",
  UnlockCollateralAndWithdrawAsset: "cdp/UnlockCollateralAndWithdrawAsset",
  LiquidateCollateral: "cdp/LiquidateCollateral",
  MintStablecoin: "cdp/MintStablecoin",
  ReturnStablecoin: "cdp/ReturnStablecoin",
  CreateRewardScheme: "cdp/CreateRewardScheme",
  UpdateRewardScheme: "cdp/UpdateRewardScheme",
  SetStablecoinMintCap: "cdp/SetStablecoinMintCap",
  SetStalePriceGracePeriod: "cdp/SetStalePriceGracePeriod",
  SetCdpPaused: "cdp/SetCdpPaused",
  ClaimRewards: "cdp/ClaimRewards",
  AddEModeCategory: "cdp/AddEModeCategory",
  UpdateEModeCategory: "cdp/UpdateEModeCategory",
  SetAccountEMode: "cdp/SetAccountEMode",
  RemoveAccountEMode: "cdp/RemoveAccountEMode",
};

const MsgSupplyAsset: AminoInit = {
  aminoType: TxTypes.SupplyAsset,
  valueMap: {},
};

const MsgWithdrawAsset: AminoInit = {
  aminoType: TxTypes.WithdrawAsset,
  valueMap: {},
};

const MsgLockCollateral: AminoInit = {
  aminoType: TxTypes.LockCollateral,
  valueMap: {},
};

const MsgUnlockCollateral: AminoInit = {
  aminoType: TxTypes.UnlockCollateral,
  valueMap: {},
};

const MsgBorrowAsset: AminoInit = {
  aminoType: TxTypes.BorrowAsset,
  valueMap: {},
};

const MsgRepayAsset: AminoInit = {
  aminoType: TxTypes.RepayAsset,
  valueMap: {},
};

const MsgSupplyAssetAndLockCollateral: AminoInit = {
  aminoType: TxTypes.SupplyAssetAndLockCollateral,
  valueMap: {},
};

const MsgUnlockCollateralAndWithdrawAsset: AminoInit = {
  aminoType: TxTypes.UnlockCollateralAndWithdrawAsset,
  valueMap: {},
};

const MsgLiquidateCollateral: AminoInit = {
  aminoType: TxTypes.LiquidateCollateral,
  valueMap: {},
};

const MsgMintStablecoin: AminoInit = {
  aminoType: TxTypes.MintStablecoin,
  valueMap: {},
};

const MsgReturnStablecoin: AminoInit = {
  aminoType: TxTypes.ReturnStablecoin,
  valueMap: {},
};

const MsgCreateRewardScheme: AminoInit = {
  aminoType: TxTypes.CreateRewardScheme,
  valueMap: {
    createRewardSchemeParams: {
      startTime: ConvertEncType.Date,
      endTime: ConvertEncType.Date,
    },
  },
};

const MsgUpdateRewardScheme: AminoInit = {
  aminoType: TxTypes.UpdateRewardScheme,
  valueMap: {
    updateRewardSchemeParams: {
      rewardSchemeId: ConvertEncType.Long,
      startTime: ConvertEncType.Date,
      endTime: ConvertEncType.Date,
    },
  },
};

const MsgClaimRewards: AminoInit = {
  aminoType: TxTypes.ClaimRewards,
  valueMap: {},
};

const MsgSetStablecoinMintCap: AminoInit = {
  aminoType: TxTypes.SetStablecoinMintCap,
  valueMap: {},
};

const MsgSetStalePriceGracePeriod: AminoInit = {
  aminoType: TxTypes.SetStalePriceGracePeriod,
  valueMap: {
    stalePriceGracePeriod: ConvertEncType.Duration,
  },
};

const MsgSetCdpPaused: AminoInit = {
  aminoType: TxTypes.SetCdpPaused,
  valueMap: {},
};

const MsgAddEModeCategory: AminoInit = {
  aminoType: TxTypes.AddEModeCategory,
  valueMap: {},
};

const MsgUpdateEModeCategory: AminoInit = {
  aminoType: TxTypes.UpdateEModeCategory,
  valueMap: {
    updateEModeCategoryParams: {
      loanToValue: ConvertEncType.Long,
      liquidationThreshold: ConvertEncType.Long,
      liquidationDiscount: ConvertEncType.Long,
    },
  },
};

const MsgSetAccountEMode: AminoInit = {
  aminoType: TxTypes.SetAccountEMode,
  valueMap: {},
};

const MsgRemoveAccountEMode: AminoInit = {
  aminoType: TxTypes.RemoveAccountEMode,
  valueMap: {},
};

const CdpAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgSupplyAsset]: generateAminoType(MsgSupplyAsset),
  [CarbonTxTypes.MsgWithdrawAsset]: generateAminoType(MsgWithdrawAsset),
  [CarbonTxTypes.MsgLockCollateral]: generateAminoType(MsgLockCollateral),
  [CarbonTxTypes.MsgUnlockCollateral]: generateAminoType(MsgUnlockCollateral),
  [CarbonTxTypes.MsgBorrowAsset]: generateAminoType(MsgBorrowAsset),
  [CarbonTxTypes.MsgRepayAsset]: generateAminoType(MsgRepayAsset),
  [CarbonTxTypes.MsgSupplyAssetAndLockCollateral]: generateAminoType(MsgSupplyAssetAndLockCollateral),
  [CarbonTxTypes.MsgUnlockCollateralAndWithdrawAsset]: generateAminoType(MsgUnlockCollateralAndWithdrawAsset),
  [CarbonTxTypes.MsgLiquidateCollateral]: generateAminoType(MsgLiquidateCollateral),
  [CarbonTxTypes.MsgMintStablecoin]: generateAminoType(MsgMintStablecoin),
  [CarbonTxTypes.MsgReturnStablecoin]: generateAminoType(MsgReturnStablecoin),
  [CarbonTxTypes.MsgCreateRewardScheme]: generateAminoType(MsgCreateRewardScheme),
  [CarbonTxTypes.MsgUpdateRewardScheme]: generateAminoType(MsgUpdateRewardScheme),
  [CarbonTxTypes.MsgClaimRewards]: generateAminoType(MsgClaimRewards),
  [CarbonTxTypes.MsgSetStablecoinMintCap]: generateAminoType(MsgSetStablecoinMintCap),
  [CarbonTxTypes.MsgSetStalePriceGracePeriod]: generateAminoType(MsgSetStalePriceGracePeriod),
  [CarbonTxTypes.MsgSetCdpPaused]: generateAminoType(MsgSetCdpPaused),
  [CarbonTxTypes.MsgAddEModeCategory]: generateAminoType(MsgAddEModeCategory),
  [CarbonTxTypes.MsgUpdateEModeCategory]: generateAminoType(MsgUpdateEModeCategory),
  [CarbonTxTypes.MsgSetAccountEMode]: generateAminoType(MsgSetAccountEMode),
  [CarbonTxTypes.MsgRemoveAccountEMode]: generateAminoType(MsgRemoveAccountEMode),
};

export default CdpAmino;
