import * as Neon from "@cityofzion/neon-core";
import { Carbon } from "@demex-sdk/codecs";
import { Blockchain, NEOAddress, Network, SimpleMap, stripHexPrefix, SWTHAddress, TokenClient } from "@demex-sdk/core";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { chunk } from "lodash";
import { NeoNetworkConfig, PolynetworkConfig, TokenInitInfo, TokensWithExternalBalance } from "../../env";
import { O3Types, O3Wallet } from "../../providers/o3Wallet";

export interface NEOClientOpts {
  polynetworkConfig: PolynetworkConfig;
  tokenClient: TokenClient;
  network: Network;
}

export interface LockO3DepositParams {
  feeAmount: BigNumber;
  amount: BigNumber;
  address: Uint8Array;
  token: TokensWithExternalBalance;
  o3Wallet: O3Wallet;
  signCompleteCallback?: () => void;
}

interface ScriptResult {
  stack: ReadonlyArray<{ type: string; value: string }>;
}

export class NEOClient {
  static blockchain: Blockchain = "Neo";

  private constructor(
    public readonly polynetworkConfig: PolynetworkConfig,
    public readonly tokenClient: TokenClient,
    public readonly network: Network,
  ) { }

  public static instance(opts: NEOClientOpts) {
    const { polynetworkConfig, tokenClient, network } = opts;

    return new NEOClient(polynetworkConfig, tokenClient, network);
  }

  public static parseHexNum(hex: string, exp: number = 0): string {
    if (!hex || typeof hex !== "string") return "0";
    const res: string = hex.length % 2 !== 0 ? `0${hex}` : hex;
    return new BigNumber(res ? Neon.u.reverseHex(res) : "00", 16).shiftedBy(-exp).toString();
  }

  public async getExternalBalances(
    address: string,
    url: string,
    whitelistDenoms?: string[],
  ): Promise<TokensWithExternalBalance[]> {
    const tokenQueryResults = await this.tokenClient.getAllTokens();
    const account = new Neon.wallet.Account(address);
    const tokens = tokenQueryResults.filter((token: Carbon.Coin.Token) => {
      const isCorrectBlockchain = this.tokenClient.getBlockchain(token.denom) === NEOClient.blockchain;
      return (isCorrectBlockchain || token.denom === "swth") && token.tokenAddress.length == 40 && token.bridgeAddress.length == 40;
    });

    const client: Neon.rpc.RPCClient = new Neon.rpc.RPCClient(url, "2.5.2"); // TODO: should we change the RPC version??

    // NOTE: fetching of tokens is chunked in sets of 15 as we may hit
    // the gas limit on the RPC node and error out otherwise
    const promises: Promise<SimpleMap<string>>[] = chunk(tokens, 75).map(async (partition: ReadonlyArray<Carbon.Coin.Token>) => {
      const acc: SimpleMap<string> = {};
      for (const token of partition) {
        if (whitelistDenoms && !whitelistDenoms.includes(token.denom)) continue;
        const sb: Neon.sc.ScriptBuilder = new Neon.sc.ScriptBuilder();
        sb.emitAppCall(Neon.u.reverseHex(token.tokenAddress), "balanceOf", [Neon.u.reverseHex(account.scriptHash)]);

        try {
          const response: ScriptResult = (await client.invokeScript(sb.str)) as ScriptResult;
          acc[token.denom.toUpperCase()] =
            response.stack[0]?.type === "Integer" // Happens on polychain devnet
              ? response.stack[0]?.value
              : NEOClient.parseHexNum(response.stack[0]?.value);
        } catch (err) {
          console.error("Could not retrieve external balance for ", token.denom);
          console.error(err);
        }
      }

      return acc;
    });

    const result = await Promise.all(promises).then((results: SimpleMap<string>[]) => {
      return results.reduce((acc: object, res: object) => ({ ...acc, ...res }), {});
    });

    const TokensWithExternalBalanceArr: TokensWithExternalBalance[] = [];
    for (const token of tokens) {
      TokensWithExternalBalanceArr.push({
        ...token,
        externalBalance: result[token.denom.toUpperCase()] ?? '0',
      });
    }

    return TokensWithExternalBalanceArr;
  }

  public async lockO3Deposit(params: LockO3DepositParams) {
    const { feeAmount, address, amount, token, o3Wallet } = params;
    if (!o3Wallet.isConnected()) {
      throw new Error("O3 wallet not connected. Please reconnect and try again.");
    }

    const publicKeyOutput = (await o3Wallet.getPublicKeyOutput()) as O3Types.PublicKeyOutput;

    const networkConfig = this.getNetworkConfig();
    const scriptHash = Neon.u.reverseHex(token.bridgeAddress);

    const fromAssetHash = Neon.u.reverseHex(token.tokenAddress);
    const fromAddress = NEOAddress.publicKeyToAddress(publicKeyOutput.publicKey);
    const targetProxyHash = this.getTargetProxyHash(token);
    const toAssetHash = Neon.u.str2hexstring(token.id);
    const toAddress = stripHexPrefix(ethers.hexlify(address));

    const nonce = Math.floor(Math.random() * 1000000);

    if (amount.lt(feeAmount)) {
      throw new Error("Invalid amount");
    }

    const data: any = [
      Neon.sc.ContractParam.hash160(fromAssetHash),
      Neon.sc.ContractParam.hash160(fromAddress),
      Neon.sc.ContractParam.byteArray(targetProxyHash, "hex"),
      Neon.sc.ContractParam.byteArray(toAssetHash, "hex"),
      Neon.sc.ContractParam.byteArray(toAddress, "hex"),
      Neon.sc.ContractParam.integer(amount.toNumber()),
      Neon.sc.ContractParam.integer(feeAmount.toNumber()),
      Neon.sc.ContractParam.byteArray(networkConfig.feeAddress, "hex"),
      Neon.sc.ContractParam.integer(nonce),
    ];

    const tx = await o3Wallet.getDAPI().invoke({
      scriptHash,
      args: data,
      operation: "lock",
      fee: 0,
    });

    return tx.txid;
  }

  public async retrieveNEP5Info(scriptHash: string): Promise<TokenInitInfo> {
    const url = this.getProviderUrl();
    const sb = new Neon.sc.ScriptBuilder();
    sb.emitAppCall(scriptHash, "symbol", []);
    sb.emitAppCall(scriptHash, "name", []);
    sb.emitAppCall(scriptHash, "decimals", []);

    const response = await Neon.rpc.Query.invokeScript(sb.str).execute(url);

    if (response?.result?.state !== "HALT") throw new Error("retrieve failed");

    const symbol = Neon.u.hexstring2str(response.result.stack?.[0].value);
    const name = Neon.u.hexstring2str(response.result.stack?.[1].value);
    const decimals = parseInt(response.result.stack?.[2].value ?? "0", 10);

    return { address: scriptHash, decimals, name, symbol };
  }

  public async formatWithdrawalAddress(address: string): Promise<string> {
    const isValidAddress = Neon.wallet.isAddress(address);
    if (!isValidAddress) {
      throw new Error("invalid address");
    }
    const scriptHash = Neon.wallet.getScriptHashFromAddress(address);
    // return the little endian version of the address
    return Neon.u.reverseHex(scriptHash);
  }

  /**
   * TargetProxyHash is a hash of token originator address that is used
   * for lockproxy asset registration and identification
   *
   * @param token
   */
  public getTargetProxyHash(token: Carbon.Coin.Token) {
    const addressBytes = SWTHAddress.getAddressBytes(token.creator, this.network);
    const addressHex = stripHexPrefix(ethers.hexlify(addressBytes));
    return addressHex;
  }

  public getNetworkConfig(): PolynetworkConfig {
    return this.polynetworkConfig;
  }

  public getConfig(): NeoNetworkConfig {
    const networkConfig = this.getNetworkConfig();
    return networkConfig.Neo;
  }

  public getProviderUrl() {
    return this.getConfig().rpcURL;
  }
}

export default NEOClient;