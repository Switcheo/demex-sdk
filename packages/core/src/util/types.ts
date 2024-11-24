import { Network } from "../env";

export interface SimpleMap<T = unknown> {
  [index: string]: T;
};

export interface NetworkMap<T> {
  [Network.MainNet]: T;
  [Network.TestNet]: T;
  [Network.DevNet]: T;
  [Network.Local]: T;
};

export type OptionalNetworkMap<T> = Partial<NetworkMap<T>>;