import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, generateAminoType } from "../utils";


type ERC20TxTypes = 'ConvertERC20' | 'ConvertCoin'

const TxTypes: Record<ERC20TxTypes, string> = {
  ConvertERC20: "erc20/MsgConvertERC20",
  ConvertCoin: "erc20/MsgConvertCoin",
};


const MsgConvertERC20: AminoInit = {
  aminoType: TxTypes.ConvertERC20,
  valueMap: {},
};
const MsgConvertCoin: AminoInit = {
  aminoType: TxTypes.ConvertCoin,
  valueMap: {},
};


const ERC20Amino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgConvertERC20]: generateAminoType(MsgConvertERC20),
  [CarbonTxTypes.MsgConvertCoin]: generateAminoType(MsgConvertCoin),
};

export default ERC20Amino;
