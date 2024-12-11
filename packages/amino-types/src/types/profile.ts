import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, AminoProcess, AminoValueMap, generateAminoType } from "../utils";




type ProfileTxTypes = 'UpdateProfile'

const TxTypes: Record<ProfileTxTypes, string> = {
  UpdateProfile: "profile/UpdateProfile",
};

const MsgUpdateProfile: AminoInit = {
  aminoType: TxTypes.UpdateProfile,
  valueMap: {},
};

const updateProfileProcess: AminoProcess = {
  toAminoProcess: (amino: AminoValueMap, input: any) => {
    const newInput = input;
    if (input.twitter === "") {
      delete newInput.twitter;
    }
    return { amino, input: newInput };
  },
  fromAminoProcess: (amino: AminoValueMap, input: any) => {
    const newInput = input;
    if (!input.twitter) {
      newInput.twitter = "";
    }
    return { amino, input: newInput };
  },
};

const ProfileAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgUpdateProfile]: generateAminoType(MsgUpdateProfile, updateProfileProcess),
};

export default ProfileAmino;
