import { WsChannel, WsConnector, WsResult, WsSubscribeWalletBalanceParams } from "@demex-sdk/websocket";
import { run } from "../utils";
import { Carbon } from "@demex-sdk/codecs";
import { defaultNetworkConfig } from "@demex-sdk/core";

type Balance = Carbon.Coin.TokenBalance;

run(async () => {
  const wsConnector = new WsConnector({
    endpoint: defaultNetworkConfig.mainnet.wsUrl,
    timeoutConnect: 5000,
    onStatusChange: (connected: boolean) => {
      console.log(`ws connection changed: ${connected ? 'connected' : 'disconnected'}`)
    },
  });

  await wsConnector.connect();

  const subscribeParams: WsSubscribeWalletBalanceParams = {
    channel: WsChannel.balances,
    address: "swth1prv0t8j8tqcdngdmjlt59pwy6dxxmtqgycy2h7",
  }
  await wsConnector.subscribe(subscribeParams, (result: WsResult<Balance[]>) => {
    console.log("balance update", result.updateType, result.data)

    if (result.updateType !== "full_state")
      wsConnector.disconnect();
  })

  await new Promise((resolve) => {
    setTimeout(async () => {
      if (wsConnector.connected) {
        console.log("disconnecting subscription after 60 seconds");
        await wsConnector.disconnect();
      }
      resolve(null);
    }, 60000);
  })
});
