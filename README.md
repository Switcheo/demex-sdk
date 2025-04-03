# Demex SDK
A Typescript software development toolkit for interfacting with the [Demex chain](https://dem.exchange/).

## Packages
| Package | Description |
| -------- | ------- |
| [@demex-sdk/core](packages/core) | Core utilities and environment constants |
| [@demex-sdk/codecs](packages/codecs) | GPRC codecs generated from Demex chain |
| [@demex-sdk/examples](packages/examples) | References and examples on how to use libraries listed here |
| [@demex-sdk/sdk](packages/sdk) | Main wrapper abstraction for interacting with Demex chain |
| [@demex-sdk/wallet](packages/wallet) | Wallet abstraction for an account |
| [@demex-sdk/transact](packages/transact) | Transaction utilities for assembling Demex transactions  |
| [@demex-sdk/amino-types](packages/amino-types) | Provides amino types map for cosmjs libraries to enable signing with amino |
| [@demex-sdk/bridge](packages/bridge) | Utilities to interact with external chains useful for executing cross-chain transfers |
| [@demex-sdk/hydrogen](packages/hydrogen) | Fetch client for Hydrogen offchain service |
| [@demex-sdk/insights](packages/insights) | Fetch client for Insights offchain service |
| [@demex-sdk/node-ledger](packages/node-ledger) | Additional tools to enable connecting wallet with a hardware wallet device |
| [@demex-sdk/polynetwork](packages/polynetwork) | Utilities for carrying out deprecated cross-chain transfers via PolyNetwork |
| [@demex-sdk/websocket](packages/websocket) | Demex websocket service client |


## Get Started
This section demonstrates the basic usage of `@demex-sdk/*` packages. Reference [@demex-sdk/examples](packages/examples) for more.

1. Install the package using `yarn` or `npm`.

Using `yarn`:
```bash
yarn install @demex-sdk/sdk
```

Using `npm`:
```bash
npm i @demex-sdk/sdk
```

2. Query chain data
```typescript
import { DemexSDK } from "@demex-sdk/sdk";

const sdk = DemexSDK.instance();
const queryClient = await sdk.getQueryClient();

// fetch chain ID
console.log("chain ID", await queryClient.chain.getChainId());

// fetch active markets
console.log("active markets", await queryClient.market.MarketAll({ isActive: true }));

// fetch address balances
console.log("balances", await queryClient.chain.getAllBalances("swth1hexzxh3apqpqzzchhgynks2xr8ar8qvdf3m9cw"));
```

3. Connect wallet
```typescript
import { DemexSDK } from "@demex-sdk/sdk";

const mnemonic = "<your mnemonics>";
const sdk = DemexSDK.instanceWithMnemonic(mnemonic);

console.log("address", sdk.wallet!.bech32Address);
```

3. Send transaction
```typescript
import { TxTypes } from "@demex-sdk/core";
import { MsgSend } from "@demex-sdk/codecs/data/cosmos/bank/v1beta1/tx";

// initialize the SDK as demonstrated above
... 

// send the desired transaction
const tx = await sdk.sendTxs([{
  typeUrl: TxTypes.MsgSend,
  value: MsgSend.fromPartial({
    amount: [{
      amount: "1",
      denom: "swth",
    }],
    fromAddress: sdk.wallet!.bech32Address,
    toAddress: "swth1hexzxh3apqpqzzchhgynks2xr8ar8qvdf3m9cw",
  })
}]);

console.log("tx result", tx);
console.log("hash", tx.transactionHash);
```

## Build

To build the project, run the following command:

```
npx turbo run build
```
