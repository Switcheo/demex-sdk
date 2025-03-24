import { baseTransformResponse, createFetchClient } from "@demex-sdk/core";
import qs from "query-string";
import { GetFeeQuoteResponse, GetRelaysRequest, GetRelaysResponse, GetTransfersRequest, GetTransfersResponse, PaginatedResult } from "./types";

const transformDate = (result: any, key: string) => {
  if (!(key in result) || !result[key] || typeof result[key] !== "string") return result;
  const value = new Date(result[key]);
  if (isNaN(value as unknown as number)) return result;
  result[key] = value;
  return result;
}

const createHydrogenClient = (baseUrl: string) => createFetchClient(baseUrl, (builder) => ({
  relays: builder.get({
    query: (request: GetRelaysRequest = {}) => ({
      path: `/relays?${qs.stringify({
        ...request,
        include_tx: true,
      })}`,
    }),
    transformResponse: baseTransformResponse<PaginatedResult<GetRelaysResponse>>,
  }),
  feeQuote: builder.get({
    query: (denom: string, feeDenoms: string[] = []) => {
      const path = `fee_quote?token_denom=${denom}`;
      const hasFeeDenoms = (feeDenoms.length ?? 0) > 0;
      if (!hasFeeDenoms) {
        return { path };
      } else {
        return {
          path, method: "post",
          init: {
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fee_denoms: feeDenoms }),
          },
        };
      }
    },
    transformResponse: (result) => {
      transformDate(result, "created_at");
      transformDate(result, "expires_at");
      return result as GetFeeQuoteResponse;
    },
  }),
  transferPayloads: builder.get({
    query: (params: GetTransfersRequest = {}) => ({
      path: `/transfer_payloads?${qs.stringify(params)}`,
    }),
    transformResponse: (result) => {
      if (Array.isArray(result?.data)) {
        result.data.forEach((item: data) => {
          transformDate(item, "created_at");
          transformDate(item, "updated_at");
        });
      }
      return result as GetTransfersResponse;
    }
  }),
}));

type HydrogenClient = ReturnType<typeof createHydrogenClient> & {
  baseUrl: string
};

namespace HydrogenClient {
  export const instance = (baseUrl: string) => {
    const client = createHydrogenClient(baseUrl) as HydrogenClient;
    client.baseUrl = baseUrl;
    return client;
  }
}

export { HydrogenClient };
