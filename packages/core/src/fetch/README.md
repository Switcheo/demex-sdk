## FetchClient Factory

### Quick Start

Create a FetchClient
```typescript
const baseUrl = "https://api.carbon.network";
const client = createFetchClient(baseUrl, (builder) => ({
  // create a fetch definition called "balances" to fetch address balances
  balances: builder.get({

    // specify query arguments
    query: (address: string) => ({

      // specify endpoint path
      path: `/cosmos/bank/v1beta1/balances/:${address}`,
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
}));

```

Using the FetchClient
```typescript
// execute specified query method
// argument required should be typed according to query specified.
// result should be typed according to transformResponse specified.
const balancesResult = await client.balances("swth1prv0t8j8tqcdngdmjlt59pwy6dxxmtqgycy2h7");
console.log("swth balance", balancesResult.balances.find(balance => balance.denom === "swth")?.amount);


// tokens result will be typed as `any` because transformResponse was not specified.
const tokensResult = await client.tokens();
console.log("tokens list", tokensResult);

```
