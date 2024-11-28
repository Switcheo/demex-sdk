import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoConverter } from "@cosmjs/stargate";
import { AminoInit, generateAminoType } from "../utils";

const TxTypes: Record<string, string> = {
  EthereumTx: "evm/v1/MsgEthereumTx",
};

const MsgEthereumTx: AminoInit = {
  aminoType: TxTypes.EthereumTx,
  valueMap: {},
};

const EvmAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgEthereumTx]: generateAminoType(MsgEthereumTx),
};

export default EvmAmino;
