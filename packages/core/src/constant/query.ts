import { Cosmos } from "@demex-sdk/codecs";

export const PGN_1K = Cosmos.Query.PageRequest.fromPartial({ limit: 1000 });
export const SHIFT_DEC_DECIMALS = 18;
