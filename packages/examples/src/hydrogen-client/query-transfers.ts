import { HydrogenClient } from "@demex-sdk/hydrogen";
import { run } from "../utils";

run(async () => {

  const baseUrl = "https://hydrogen-api.carbon.network/";
  const client = HydrogenClient.instance(baseUrl);

  const result = await client.relays();

  console.log("relays", result.data);
});
