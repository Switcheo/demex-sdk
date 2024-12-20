import { AminoConverter } from "@cosmjs/stargate";
import { Carbon, TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { TextProposal } from "@demex-sdk/codecs/data/cosmos/gov/v1beta1/gov";
import { MsgSubmitProposal } from "@demex-sdk/codecs/data/cosmos/gov/v1beta1/tx";
import * as GovUtils from "../gov";
import { AminoInit, AminoProcess, AminoValueMap, ConvertEncType, generateAminoType, mapEachIndiv } from "../utils";




type GovTxTypes = 'SubmitProposal' | 'Deposit' | 'Vote'

const TxTypes: Record<GovTxTypes, string> = {
  SubmitProposal: "cosmos-sdk/MsgSubmitProposal",
  Deposit: "cosmos-sdk/MsgDeposit",
  Vote: "cosmos-sdk/MsgVote",
};

const ContentTypes: Record<string, string> = {
  [GovUtils.ProposalTypes.CreateToken]: "coin/CreateTokenProposal",
  [GovUtils.ProposalTypes.SetMsgGasCost]: "fee/SetMsgGasCostProposal",
  [GovUtils.ProposalTypes.SetMinGasPrice]: "fee/SetMinGasPriceProposal",
  [GovUtils.ProposalTypes.RemoveMsgGasCost]: "fee/RemoveMsgGasCostProposal",
  [GovUtils.ProposalTypes.RemoveMinGasPrice]: "fee/RemoveMinGasPriceProposal",
  [GovUtils.ProposalTypes.SetCommitmentCurve]: "liquiditypool/SetCommitmentCurveProposal",
  [GovUtils.ProposalTypes.SetRewardCurve]: "liquiditypool/SetRewardCurveProposal",
  [GovUtils.ProposalTypes.SetRewardsWeights]: "liquiditypool/SetRewardsWeightsProposal",
  [GovUtils.ProposalTypes.UpdatePool]: "liquiditypool/UpdatePoolProposal",
  [GovUtils.ProposalTypes.UpdateMarket]: "market/UpdateMarketProposal",
  [GovUtils.ProposalTypes.CreateGroup]: "coin/CreateGroupProposal",
  [GovUtils.ProposalTypes.UpdateGroup]: "coin.UpdateGroupProposal",
  [GovUtils.ProposalTypes.RegisterToGroup]: "coin/RegisterToGroupProposal",
  [GovUtils.ProposalTypes.DeregisterFromGroup]: "coin.DeregisterFromGroupProposal",
  [GovUtils.ProposalTypes.WithdrawFromGroup]: "coin/WithdrawFromGroupProposal",
  [GovUtils.ProposalTypes.UpdateGroupTokenConfig]: "coin.UpdateGroupTokenConfigProposal",
};

const SubmitProposalMsg: AminoInit = {
  aminoType: TxTypes.SubmitProposal,
  valueMap: {},
};

const MsgDeposit: AminoInit = {
  aminoType: TxTypes.Deposit,
  valueMap: {
    proposalId: ConvertEncType.Long,
  },
};

const MsgVote: AminoInit = {
  aminoType: TxTypes.Vote,
  valueMap: {
    proposalId: ConvertEncType.Long,
  },
};

const CreateToken: AminoValueMap = {
  value: {
    msg: {
      decimals: ConvertEncType.Long,
      chainId: ConvertEncType.Long,
      bridgeId: ConvertEncType.Long,
    },
  },
};

const CreateGroup: AminoValueMap = {
  value: {
    msg: {
      creator: ConvertEncType.Long,
      name: ConvertEncType.Long,
      chequeTokenSymbol: ConvertEncType.Long,
      oraclieId: ConvertEncType.Long,
    },
  },
}

const UpdateGroup: AminoValueMap = {
  value: {
    msg: {
      creator: ConvertEncType.Long,
      groupId: ConvertEncType.Long,
      updateGroupParams: {
        name: ConvertEncType.Long,
      },
    },
  },
}

const RegisterToGroup: AminoValueMap = {
  value: {
    msg: {
      creator: ConvertEncType.Long,
      groupId: ConvertEncType.Long,
      denom: ConvertEncType.Long,
    },
  },
}

const DeregisterFromGroup: AminoValueMap = {
  value: {
    msg: {
      creator: ConvertEncType.Long,
      groupId: ConvertEncType.Long,
      denom: ConvertEncType.Long,
    },
  },
}

const UpdateGroupConfig: AminoValueMap = {
  value: {
    msg: {
      creator: ConvertEncType.Long,
      denom: ConvertEncType.Long,
      updatedGroupedTokenConfigParams: {
        isActive: ConvertEncType.Long,
      },
    },
  },
}

const UpdatePool: AminoValueMap = {
  value: {
    msg: {
      poolId: ConvertEncType.Long,
      swapFee: ConvertEncType.Dec,
      numQuotes: ConvertEncType.Long,
    },
  },
};

const SetCommitmentCurve: AminoValueMap = {
  value: {
    msg: {
      maxDuration: ConvertEncType.Long,
    },
  },
};

const SetRewardCurve: AminoValueMap = {
  value: {
    msg: {
      startTime: ConvertEncType.Date,
      reductionIntervalSeconds: ConvertEncType.Long,
    },
  },
};

const SetRewardWeights: AminoValueMap = {
  value: {
    msg: {
      poolId: ConvertEncType.Long,
    },
  },
};


const UpdateMarket: AminoValueMap = {
  value: {
    msg: {
      tickSize: ConvertEncType.Dec,
      makerFee: ConvertEncType.Dec,
      takerFee: ConvertEncType.Dec,
      initialMarginBase: ConvertEncType.Dec,
      initialMarginStep: ConvertEncType.Dec,
      maintenanceMarginRatio: ConvertEncType.Dec,
      maxLiquidationOrderDuration: ConvertEncType.Duration,
    },
  },
};

interface AminoProposalRes {
  newContent: {
    type: string;
    value: any;
  };
  newAmino: AminoValueMap;
}

interface DirectProposalRes {
  newContent: {
    typeUrl: string;
    value: Uint8Array;
  };
  newAmino: AminoValueMap;
}

const preProcessAmino = (value: Record<string, any>, valueMap: AminoValueMap): Record<string, any> | null | undefined => {
  return mapEachIndiv(value, valueMap, false);
};

const checkDecodeProposal = (content: any, amino: AminoValueMap): AminoProposalRes => {
  const decodedValue = GovUtils.decodeContent(content);
  const newContent = {
    type: ContentTypes[content.typeUrl]!,
    value: decodedValue.value,
  };
  const newAmino = { ...amino };

  switch (content.typeUrl) {
    case GovUtils.ProposalTypes.UpdatePool:
      newAmino.content = { ...UpdatePool };
      break;
    case GovUtils.ProposalTypes.CreateToken:
      newAmino.content = { ...CreateToken };
      break;
    case GovUtils.ProposalTypes.CreateGroup:
      newAmino.content = { ...CreateGroup };
      break;
    case GovUtils.ProposalTypes.UpdateGroup:
      newAmino.content = { ...UpdateGroup };
      break;
    case GovUtils.ProposalTypes.RegisterToGroup:
      newAmino.content = { ...RegisterToGroup };
      break;
    case GovUtils.ProposalTypes.DeregisterFromGroup:
      newAmino.content = { ...DeregisterFromGroup };
      break;
    case GovUtils.ProposalTypes.UpdateGroupTokenConfig:
      newAmino.content = { ...UpdateGroupConfig };
      break;
    case GovUtils.ProposalTypes.SetCommitmentCurve:
      newAmino.content = { ...SetCommitmentCurve };
      break;
    case GovUtils.ProposalTypes.SetRewardCurve:
      newAmino.content = { ...SetRewardCurve };
      break;
    case GovUtils.ProposalTypes.SetRewardsWeights:
      newAmino.content = { ...SetRewardWeights };
      break;
    case GovUtils.ProposalTypes.SetMsgGasCost:
      newAmino.content = {};
      break;
    case GovUtils.ProposalTypes.SetMinGasPrice:
      newAmino.content = {};
      break;
    case GovUtils.ProposalTypes.RemoveMsgGasCost:
      newAmino.content = {};
      break;
    case GovUtils.ProposalTypes.RemoveMinGasPrice:
      newAmino.content = {};
      break;
    case GovUtils.ProposalTypes.UpdateMarket:
      newAmino.content = { ...UpdateMarket };
      break;
    case GovUtils.ProposalTypes.Text:
      newAmino.content = {};
      break;
    default:
      break;
  }
  return {
    newContent,
    newAmino,
  };
};

const checkEncodeProposal = (content: any, amino: AminoValueMap): DirectProposalRes => {
  switch (content.type) {
    case ContentTypes[GovUtils.ProposalTypes.UpdatePool]: {
      const updatePoolMsg = preProcessAmino(content.value.msg, UpdatePool.value!.msg!);
      const updatePoolProp = Carbon.Liquiditypool.UpdatePoolProposal.fromPartial({
        ...content.value,
        msg: updatePoolMsg,
      });
      return {
        newContent: {
          typeUrl: GovUtils.ProposalTypes.UpdatePool,
          value: Carbon.Liquiditypool.UpdatePoolProposal.encode(updatePoolProp).finish(),
        },
        newAmino: {
          ...amino,
        },
      };
    }
    case ContentTypes[GovUtils.ProposalTypes.CreateToken]: {
      const createTokenMsg = preProcessAmino(content.value.msg, CreateToken.value!.msg!);
      const createTokenProp = Carbon.Coin.CreateTokenProposal.fromPartial({
        ...content.value,
        msg: createTokenMsg,
      });
      return {
        newContent: {
          typeUrl: GovUtils.ProposalTypes.CreateToken,
          value: Carbon.Coin.CreateTokenProposal.encode(createTokenProp).finish(),
        },
        newAmino: {
          ...amino,
        },
      };
    }
    // TODO: add support for normal messages to run gov props via amino
    // eg. use fee/SetMsgGasCost instead of fee/SetGasCostProposal (this has been deprecated)

    // case ContentTypes[GovUtils.ProposalTypes.SetMsgGasCost]: {
    //   const setMsgGasCostMsg = preProcessAmino(content.value.msg, {});
    //   const setMsgGasCostProp = Carbon.Fee.SetMsgGasCostProposal.fromPartial({
    //     ...content.value,
    //     msg: setMsgGasCostMsg,
    //   });
    //   return {
    //     newContent: {
    //       typeUrl: GovUtils.ProposalTypes.SetMsgGasCost,
    //       value: Carbon.Fee.SetMsgGasCostProposal.encode(setMsgGasCostProp).finish(),
    //     },
    //     newAmino: {
    //       ...amino,
    //     },
    //   };
    // }
    // case ContentTypes[GovUtils.ProposalTypes.SetMinGasPrice]: {
    //   const setMinGasPriceMsg = preProcessAmino(content.value.msg, {});
    //   const setMinGasPriceProp = Carbon.Fee.SetMinGasPriceProposal.fromPartial({
    //     ...content.value,
    //     msg: setMinGasPriceMsg,
    //   });
    //   return {
    //     newContent: {
    //       typeUrl: GovUtils.ProposalTypes.SetMinGasPrice,
    //       value: Carbon.Fee.SetMinGasPriceProposal.encode(setMinGasPriceProp).finish(),
    //     },
    //     newAmino: {
    //       ...amino,
    //     },
    //   };
    // }
    // case ContentTypes[GovUtils.ProposalTypes.RemoveMsgGasCost]: {
    //   const removeMsgGasCostMsg = preProcessAmino(content.value.msg, {});
    //   const removeMsgGasCostProp = Carbon.Fee.RemoveMsgGasCostProposal.fromPartial({
    //     ...content.value,
    //     msg: removeMsgGasCostMsg,
    //   });
    //   return {
    //     newContent: {
    //       typeUrl: GovUtils.ProposalTypes.RemoveMsgGasCost,
    //       value: Carbon.Fee.RemoveMsgGasCostProposal.encode(removeMsgGasCostProp).finish(),
    //     },
    //     newAmino: {
    //       ...amino,
    //     },
    //   };
    // }
    // case ContentTypes[GovUtils.ProposalTypes.RemoveMinGasPrice]: {
    //   const removeMinGasPriceMsg = preProcessAmino(content.value.msg, {});
    //   const removeMinGasPriceProp = Carbon.Fee.RemoveMinGasPriceProposal.fromPartial({
    //     ...content.value,
    //     msg: removeMinGasPriceMsg,
    //   });
    //   return {
    //     newContent: {
    //       typeUrl: GovUtils.ProposalTypes.RemoveMinGasPrice,
    //       value: Carbon.Fee.RemoveMinGasPriceProposal.encode(removeMinGasPriceProp).finish(),
    //     },
    //     newAmino: {
    //       ...amino,
    //     },
    //   };
    // }
    case ContentTypes[GovUtils.ProposalTypes.SetCommitmentCurve]: {
      const setCommitCurveMsg = preProcessAmino(content.value.msg, SetCommitmentCurve.value!.msg!);
      const commitCurveProp = Carbon.Liquiditypool.SetCommitmentCurveProposal.fromPartial({
        ...content.value,
        msg: setCommitCurveMsg,
      });
      return {
        newContent: {
          typeUrl: GovUtils.ProposalTypes.SetCommitmentCurve,
          value: Carbon.Liquiditypool.SetCommitmentCurveProposal.encode(commitCurveProp).finish(),
        },
        newAmino: {
          ...amino,
        },
      };
    }
    case ContentTypes[GovUtils.ProposalTypes.SetRewardCurve]: {
      const setRewardCurveMsg = preProcessAmino(content.value.msg, SetRewardCurve.value!.msg!);
      const rewardCurveProp = Carbon.Liquiditypool.SetRewardCurveProposal.fromPartial({
        ...content.value,
        msg: setRewardCurveMsg,
      });
      return {
        newContent: {
          typeUrl: GovUtils.ProposalTypes.SetRewardCurve,
          value: Carbon.Liquiditypool.SetRewardCurveProposal.encode(rewardCurveProp).finish(),
        },
        newAmino: {
          ...amino,
        },
      };
    }
    case ContentTypes[GovUtils.ProposalTypes.SetRewardsWeights]: {
      const setRewardWeightsMsg = preProcessAmino(content.value.msg, SetRewardWeights.value!.msg!);
      const rewardWeightsProp = Carbon.Liquiditypool.SetRewardsWeightsProposal.fromPartial({
        ...content.value,
        msg: setRewardWeightsMsg,
      });
      return {
        newContent: {
          typeUrl: GovUtils.ProposalTypes.SetRewardsWeights,
          value: Carbon.Liquiditypool.SetRewardsWeightsProposal.encode(rewardWeightsProp).finish(),
        },
        newAmino: {
          ...amino,
        },
      };
    }
    case ContentTypes[GovUtils.ProposalTypes.UpdateMarket]: {
      const updateMarketMsg = preProcessAmino(content.value.msg, UpdateMarket.value!.msg!);
      const updateMarketProp = Carbon.Market.UpdateMarketProposal.fromPartial({
        ...content.value,
        msg: updateMarketMsg,
      });
      return {
        newContent: {
          typeUrl: GovUtils.ProposalTypes.UpdateMarket,
          value: Carbon.Market.UpdateMarketProposal.encode(updateMarketProp).finish(),
        },
        newAmino: {
          ...amino,
        },
      };
    }
    case ContentTypes[GovUtils.ProposalTypes.Text]: {
      const textProposal = TextProposal.fromPartial({
        ...content.value,
      });
      return {
        newContent: {
          typeUrl: GovUtils.ProposalTypes.Text,
          value: TextProposal.encode(textProposal).finish(),
        },
        newAmino: {
          ...amino,
        },
      };
    }
    default:
      return {
        newContent: {
          typeUrl: "",
          value: new Uint8Array(),
        },
        newAmino: {
          ...amino,
        },
      };
  }
};

const proposalAminoProcess: AminoProcess = {
  toAminoProcess: (amino: AminoValueMap, input: any) => {
    const { content } = input as MsgSubmitProposal;
    const propResponse = checkDecodeProposal(content, amino);
    return {
      amino: propResponse.newAmino,
      input: {
        ...input,
        content: propResponse.newContent,
      },
    };
  },
  fromAminoProcess: (amino: AminoValueMap, input: any) => {
    const { content } = input;
    const propResponse = checkEncodeProposal(content, amino);
    return {
      amino: propResponse.newAmino,
      input: {
        ...input,
        content: propResponse.newContent,
      },
    };
  },
};

const GovAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgSubmitProposal]: generateAminoType(SubmitProposalMsg, proposalAminoProcess),
  [CarbonTxTypes.MsgDeposit]: generateAminoType(MsgDeposit),
  [CarbonTxTypes.MsgVote]: generateAminoType(MsgVote),
};

export default GovAmino;
