import { baseTransformResponse, createFetchClient } from "@demex-sdk/core";
import { run } from "../utils";

interface BalancesQueryResponse {
  balances: {
    denom: string
    amount: string
  }[]
  pagination: {
    next_key: string | null
    total: string
  }
}

run(async () => {

  const baseUrl = "https://api.carbon.network";
  const client = createFetchClient(baseUrl, (builder) => ({
    // create a fetch definition called "balances" to fetch address balances
    balances: builder.get({

      // specify query arguments
      query: (address: string) => ({

        // specify endpoint path
        path: `/cosmos/bank/v1beta1/balances/${address}`,
      }),

      // specify response transformation function
      transformResponse: baseTransformResponse<BalancesQueryResponse>
    }),

    // create a fetch definition called "tokens" to fetch tokens
    tokens: builder.get({
      query: () => ({
        path: `/carbon/coin/v1/tokens`,
      }),
    }),

    // create a fetch definition called "cdpAssets" to fetch borrowable asset
    cdpAssets: builder.get({
      query: "/carbon/cdp/v1/asset",
    }),
  }));

  // execute specified query method
  // argument required should be typed according to query specified.
  // result should be typed according to transformResponse specified.
  const balancesResult = await client.balances("swth1prv0t8j8tqcdngdmjlt59pwy6dxxmtqgycy2h7");
  console.log("swth balance", balancesResult.balances.find(balance => balance.denom === "swth")?.amount);

  // tokens result will be typed as `any` because transformResponse was not specified.
  const tokensResult = await client.tokens();
  console.log("tokens list", tokensResult);

  const assetsResult = await client.cdpAssets();
  console.log("borrowable assets list", assetsResult);
});
