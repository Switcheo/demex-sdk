import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { QueryClientImpl } from "@demex-sdk/codecs/src/Switcheo/carbon/coin/query";

export class DemexClient {
  constructor(tmClient: Tendermint37Client) {
    const rpcClient = createProtobufRpcClient(new QueryClient(tmClient));
    new QueryClientImpl(rpcClient);
  }
}
