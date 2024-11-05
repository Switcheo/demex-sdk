import { StargateClient } from "@cosmjs/stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";

/**
 * BlockchainClient is functionally the same with StargateClient,
 * with an additional static initializer:
 *
 * ```
 * BlockchainClient.connectWithTm(tmClient: Tendermint37Client)
 * ```
 *
 * @see StargateClient
 */
export class BlockchainClient extends StargateClient {
  static connectWithTm(tmClient: Tendermint37Client): BlockchainClient {
    return new BlockchainClient(tmClient, {});
  }
}
