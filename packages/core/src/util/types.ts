import { NetworkMap } from "../env";

export interface SimpleMap<T = unknown> {
  [index: string]: T;
};

export type OptionalNetworkMap<T> = Partial<NetworkMap<T>>;