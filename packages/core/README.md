## @demex-sdk/core

Core module for most utility functions and object models required for other @demex-sdk packages.

## Quick Start

Install the package with your favourite package manager.
```shell
yarn add @demex-sdk/core
```

### Example: Query address balances

```typescript
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { DemexQueryClient } from "@demex-sdk/core";


const rpcUrl = "https://tm-api.carbon.network";
const address = "swth1jv65s3grqf6v6jl3dp4t6c9t9rk99cd8cpw26x";

const tmClient = await Tendermint37Client.connect(rpcUrl);
const queryClient = DemexQueryClient.instance({ tmClient });

const result = await queryClient.bank.AllBalances({ address, resolveDenom: false });
result.balances.forEach((bal) => console.log(bal.amount, bal.denom));
```
