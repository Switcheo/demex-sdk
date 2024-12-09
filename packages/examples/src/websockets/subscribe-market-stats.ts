import { Carbon } from "@demex-sdk/codecs";
import { defaultNetworkConfig } from "@demex-sdk/core";
import { WsChannel, WsConnector, WsResult, WsSubscribeMarketStatsAllParams, WsUpdateType } from "@demex-sdk/websocket";
import { run } from "../utils";

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

  const subscribeParams: WsSubscribeMarketStatsAllParams = {
    channel: WsChannel.market_stats,
  }
  await wsConnector.subscribe(subscribeParams, (result: WsResult<Balance[]>) => {
    console.log("market stats update", result.updateType, result.data)

    if (result.updateType !== WsUpdateType.FullState)
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
