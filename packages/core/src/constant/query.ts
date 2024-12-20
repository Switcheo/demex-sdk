import { Query } from "@demex-sdk/codecs";

export const PGN_1K = Query.PageRequest.fromPartial({ limit: 1000 });
export const PGN_10K = Query.PageRequest.fromPartial({ limit: 10000 });