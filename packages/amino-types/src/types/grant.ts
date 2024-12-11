import { AminoConverter } from "@cosmjs/stargate";
import { Any, TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { GenericAuthorization } from "@demex-sdk/codecs/data/cosmos/authz/v1beta1/authz";
import { MsgGrant } from "@demex-sdk/codecs/data/cosmos/authz/v1beta1/tx";
import { AllowedMsgAllowance, BasicAllowance } from "@demex-sdk/codecs/data/cosmos/feegrant/v1beta1/feegrant";
import { MsgGrantAllowance } from "@demex-sdk/codecs/data/cosmos/feegrant/v1beta1/tx";
import { AminoInit, AminoProcess, AminoValueMap, ConvertEncType, generateAminoType, mapEachIndiv } from "../utils";

const TxTypes: Record<string, string> = {
  GrantAuthz: "cosmos-sdk/MsgGrant",
  GrantAllowance: "cosmos-sdk/MsgGrantAllowance",
  RevokeAuthz: "cosmos-sdk/MsgRevoke",
  RevokeFeegrant: "cosmos-sdk/MsgRevokeAllowance",
  MsgExec: "cosmos-sdk/MsgExec",
};

export enum GrantTypes {
  GrantAuthz = "/cosmos.authz.v1beta1.MsgGrant",
  RevokeAuthz = "/cosmos.authz.v1beta1.MsgRevoke",
  FeeGrant = "/cosmos.feegrant.v1beta1.MsgGrantAllowance",
  MsgExec = "/cosmos.authz.v1beta1.MsgExec",
  GenericAuthorization = "/cosmos.authz.v1beta1.GenericAuthorization",
  AllowedMsgAllowance = "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
  BasicAllowance = "/cosmos.feegrant.v1beta1.BasicAllowance",
}

const ContentTypes: Record<string, string> = {
  [GrantTypes.GenericAuthorization]: "cosmos-sdk/GenericAuthorization",
  [GrantTypes.AllowedMsgAllowance]: "cosmos-sdk/AllowedMsgAllowance",
  [GrantTypes.BasicAllowance]: "cosmos-sdk/BasicAllowance",
};

const GenericAuthorizationAminoType: AminoInit = {
  aminoType: ContentTypes[GrantTypes.GenericAuthorization],
  valueMap: {},
}

const AllowedMsgAllowanceAminoType: AminoInit = {
  aminoType: ContentTypes[GrantTypes.AllowedMsgAllowance],
  valueMap: {},
}

const BasicAllowanceAminoType: AminoInit = {
  aminoType: ContentTypes[GrantTypes.BasicAllowance],
  valueMap: {
    expiration: ConvertEncType.Date,
  },
}

const MsgGrantAuthz: AminoInit = {
  aminoType: TxTypes.GrantAuthz,
  valueMap: {
    grant: {
      expiration: ConvertEncType.Date,
    },
  },
};

const MsgRevokeAuthz: AminoInit = {
  aminoType: TxTypes.RevokeAuthz,
  valueMap: {},
}

const MsgFeeGrantAllowance: AminoInit = {
  aminoType: TxTypes.GrantAllowance,
  valueMap: {},
}

const MsgRevokeAllowance: AminoInit = {
  aminoType: TxTypes.RevokeFeegrant,
  valueMap: {},
}

const MsgExec: AminoInit = {
  aminoType: TxTypes.MsgExec,
  valueMap: {},
}

const GenericAuthorizationAmino: AminoValueMap = {
  value: {
    msg: ConvertEncType,
  },
}

const MsgFeeGrantAllowanceAmino: AminoValueMap = {
  value: {
    msg: ConvertEncType,
  },
}

interface AminoRes {
  newContent: {
    type: string;
    value: any;
  };
  newAmino: AminoValueMap;
}

interface DirectRes {
  newContent: {
    typeUrl: string;
    value: Uint8Array;
  };
  newAmino: AminoValueMap;
}

const preProcessAmino = (value: Record<string, any>, valueMap: AminoValueMap): Record<string, any> | null | undefined => {
  return mapEachIndiv(value, valueMap, false);
};

const checkDecodeGrantAuthz = (content: any, amino: AminoValueMap): AminoRes => {
  const decodedValue = decodeContent(content);
  const newContent = {
    type: ContentTypes[content.typeUrl],
    value: decodedValue.value,
  }

  const newAmino = { ...amino };

  newAmino.content = { ...GenericAuthorizationAmino.value }

  return {
    newContent,
    newAmino,
  }
}

const checkEncodeGrantAuthz = (content: any, amino: AminoValueMap): DirectRes => {
  const grantAuthzMsg = preProcessAmino(content.value, GenericAuthorizationAmino.value.msg)
  const grantAuthzProp = GenericAuthorization.fromPartial({
    ...content.value,
    msg: grantAuthzMsg,
  })
  return {
    newContent: {
      typeUrl: GrantTypes.GenericAuthorization,
      value: GenericAuthorization.encode(grantAuthzProp).finish(),
    },
    newAmino: {
      ...amino,
    },
  }
}

const grantAuthzAminoProcess: AminoProcess = {
  toAminoProcess: (amino: AminoValueMap, input: any) => {
    const { grant } = input as MsgGrant;
    const propResponse = checkDecodeGrantAuthz(grant?.authorization, amino);

    return {
      amino: propResponse.newAmino,
      input: {
        ...input,
        grant: {
          ...grant,
          authorization: propResponse.newContent,
        },
      },
    }
  },
  fromAminoProcess: (amino: AminoValueMap, input: any) => {
    const { grant } = input;
    const propResponse = checkEncodeGrantAuthz(grant?.authorization, amino)

    return {
      amino: propResponse.newAmino,
      ...input,
      grant: {
        ...grant,
        authorization: propResponse.newContent,
      },
    }
  },
}


const checkEncodeFeegrant = (content: any, amino: AminoValueMap): DirectRes => {
  const msg = preProcessAmino(content.value, MsgFeeGrantAllowanceAmino.value.msg)
  const grantAllowance = MsgGrantAllowance.fromPartial({
    ...content.value,
    msg,
  })
  const newContent = {
    typeUrl: GrantTypes.FeeGrant,
    value: MsgGrantAllowance.encode(grantAllowance).finish(),
  }
  const newAmino = { ...amino }
  return {
    newContent,
    newAmino,
  }
}

const checkDecodeFeegrant = (content: any, amino: AminoValueMap): AminoRes => {
  const decodedValue = decodeContent(content);
  decodedValue.value.allowance = {
    type: ContentTypes[decodedValue.value.allowance.typeUrl],
    value: decodedValue.value.allowance.value,
  }

  const newContent = {
    type: ContentTypes[content.typeUrl],
    value: decodedValue.value,
  }

  const newAmino = { ...amino };

  newAmino.content = { ...MsgFeeGrantAllowanceAmino.value }
  return {
    newContent,
    newAmino,
  }
}

const feegrantAminoProcess: AminoProcess = {
  toAminoProcess: (amino: AminoValueMap, input: any) => {
    const { allowance } = input as MsgGrantAllowance;
    const propResponse = checkDecodeFeegrant(allowance, amino);
    return {
      amino: propResponse.newAmino,
      input: {
        ...input,
        allowance: propResponse.newContent,
      },
    }
  },
  fromAminoProcess: (amino: AminoValueMap, input: any) => {
    const { allowance } = input as MsgGrantAllowance;
    const propResponse = checkEncodeFeegrant(allowance, amino)
    return {
      amino: propResponse.newAmino,
      input: {
        ...input,
        allowance: propResponse.newContent,
      },
    };
  },
}

const GrantAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgGrant]: generateAminoType(MsgGrantAuthz, grantAuthzAminoProcess),
  [CarbonTxTypes.MsgRevoke]: generateAminoType(MsgRevokeAuthz),
  [CarbonTxTypes.MsgGrantAllowance]: generateAminoType(MsgFeeGrantAllowance, feegrantAminoProcess),
  [CarbonTxTypes.MsgRevokeAllowance]: generateAminoType(MsgRevokeAllowance),
  [CarbonTxTypes.MsgExec]: generateAminoType(MsgExec),
  [GrantTypes.GenericAuthorization]: generateAminoType(GenericAuthorizationAminoType),
  [GrantTypes.AllowedMsgAllowance]: generateAminoType(AllowedMsgAllowanceAminoType),
  [GrantTypes.BasicAllowance]: generateAminoType(BasicAllowanceAminoType),
};

export default GrantAmino;

export interface ValueDecoded {
  typeUrl: string;
  value: any;
}

export const emptyValue = {
  typeUrl: "",
  value: {},
}

export const decodeContent = (content?: Any): ValueDecoded => {
  if (!content) {
    return emptyValue;
  }

  switch (content.typeUrl) {
    case GrantTypes.GenericAuthorization: {
      return {
        ...content,
        value: GenericAuthorization.decode(content.value),
      }
    }
    case GrantTypes.AllowedMsgAllowance: {
      const value = AllowedMsgAllowance.decode(content.value)
      return {
        ...content,
        value: { ...value, allowance: { ...decodeContent(value.allowance) } },
      }
    }
    case GrantTypes.BasicAllowance: {
      return {
        ...content,
        value: BasicAllowance.decode(content.value),
      }
    }
    default:
      return emptyValue;
  }
}
