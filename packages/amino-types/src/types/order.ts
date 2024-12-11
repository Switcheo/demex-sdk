import { AminoConverter } from "@cosmjs/stargate";
import { TxTypes as CarbonTxTypes } from "@demex-sdk/codecs";
import { AminoInit, AminoProcess, AminoValueMap, BN_ZERO, bnOrZero, ConvertEncType, generateAminoType } from "../utils";



type OrderTxTypes = 'CreateOrder' | 'CancelOrder' | 'EditOrder' | 'CancelAll'

const TxTypes: Record<OrderTxTypes, string> = {
  CreateOrder: "order/CreateOrder",
  CancelOrder: "order/CancelOrder",
  EditOrder: "order/EditOrder",
  CancelAll: "order/CancelAll",
};

const MsgCreateOrder: AminoInit = {
  aminoType: TxTypes.CreateOrder,
  valueMap: {
    price: ConvertEncType.Dec,
    stopPrice: ConvertEncType.Dec,
  },
};

const MsgCancelOrder: AminoInit = {
  aminoType: TxTypes.CancelOrder,
  valueMap: {},
};

const MsgEditOrder: AminoInit = {
  aminoType: TxTypes.EditOrder,
  valueMap: {
    price: ConvertEncType.DecOrZero,
    stopPrice: ConvertEncType.DecOrZero,
  },
};

const MsgCancelAll: AminoInit = {
  aminoType: TxTypes.CancelAll,
  valueMap: {},
};

const createOrderProcess: AminoProcess = {
  toAminoProcess: (amino: AminoValueMap, input: any) => {
    const newInput = input;
    if (!input.isPostOnly) {
      delete newInput.isPostOnly;
    }
    if (!input.isReduceOnly) {
      delete newInput.isReduceOnly;
    }
    if (input.timeInForce === "") {
      delete newInput.timeInForce;
    }
    if (input.triggerType === "") {
      delete newInput.triggerType;
    }
    newInput.stopPrice = input.stopPrice === "" ? "0" : input.stopPrice;
    newInput.price = input.price === "" ? "0" : input.price;
    return { amino, input: newInput };
  },
  fromAminoProcess: (amino: AminoValueMap, input: any) => {
    const newInput = {
      ...input,
      is_post_only: input.is_post_only ?? false,
      is_reduce_only: input.is_reduce_only ?? false,
      time_in_force: input.time_in_force ?? "",
      trigger_type: input.trigger_type ?? "",
      stop_price: bnOrZero(input.stop_price, BN_ZERO).eq(0) ? "" : input.stop_price,
      price: bnOrZero(input.price, BN_ZERO).eq(0) ? "" : input.price,
    };
    return { amino, input: newInput };
  },
};

const OrderAmino: Record<string, AminoConverter> = {
  [CarbonTxTypes.MsgCreateOrder]: generateAminoType(MsgCreateOrder, createOrderProcess),
  [CarbonTxTypes.MsgCancelOrder]: generateAminoType(MsgCancelOrder),
  [CarbonTxTypes.MsgEditOrder]: generateAminoType(MsgEditOrder),
  [CarbonTxTypes.MsgCancelAll]: generateAminoType(MsgCancelAll),
};

export default OrderAmino;
