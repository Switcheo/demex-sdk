import { HydrogenClient } from "@demex-sdk/hydrogen";
import { run } from "../utils";

run(async () => {

  const baseUrl = "https://hydrogen-api.carbon.network/";
  const client = HydrogenClient.instance(baseUrl);

  const result = await client.feeQuote("usdc.1.17.851a3a");

  console.log("fee quotes", result);
});
