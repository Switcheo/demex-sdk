import Codecs from "@demex-sdk/codecs";
import { TokenClient } from "../helpers";

export interface PolyNetworkBridge extends Codecs.Carbon.Coin.Bridge {
  isEvmChain: boolean;
};

export interface IbcBridge extends Codecs.Carbon.Coin.Bridge {
  chain_id_name: string;
  channels: {
    src_channel: string;
    dst_channel: string;
    port_id: string; // for cosmwasm bridges
  }
};

export interface AxelarBridge extends Codecs.Carbon.Coin.Bridge {
  chain_id_name: string;
  bridgeAddress: string;
};

export interface BridgeMap {
  polynetwork: PolyNetworkBridge[]
  ibc: IbcBridge[]
  axelar: AxelarBridge[]
};

export type BlockchainV2 = ReturnType<TokenClient['getAllBlockchainNames']>[number] | "Native" | "Carbon" | "Tradehub" | "Ibc" | "Polynetwork";

export const BRIDGE_IDS = {
  polynetwork: 1,
  ibc: 2,
  axelar: 3,
};