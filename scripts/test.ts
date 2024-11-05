import { QueryClientImpl as AllianceQueryClient } from "@demex-sdk/codecs/alliance/alliance/query.js";
import { createProtobufRpcClient, QueryClient } from "@cosmjs/stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
const run = <T>(runnable: () => T | Promise<T>) => {
  const execAsync = async () => await runnable();
  execAsync()
    .then(() => process.exit(0))
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}

run(async () => {
  const tmClient = await Tendermint37Client.connect("https://api.carbon.network");
  const query = QueryClient.withExtensions(tmClient,
    (base: QueryClient) => ({ alliance: new AllianceQueryClient(createProtobufRpcClient(base)) }),
  );
});
