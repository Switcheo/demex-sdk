import Codecs from "@demex-sdk/codecs";
import { TokenClient } from "../helpers";

export type PolyNetworkBridge = Codecs.Carbon.Coin.Bridge;;

export interface AxelarBridge extends Codecs.Carbon.Coin.Bridge {
  chain_id_name: string;
  bridgeAddress: string;
};

export interface BridgeMap {
  polynetwork: PolyNetworkBridge[]
  axelar: AxelarBridge[]
};

export type Blockchain = ReturnType<TokenClient['getAllBlockchainNames']>[number] | "Native" | "Carbon" | "Tradehub" | "Ibc" | "Polynetwork";

export const BRIDGE_IDS = {
  polynetwork: 1,
  ibc: 2,
  axelar: 3,
};