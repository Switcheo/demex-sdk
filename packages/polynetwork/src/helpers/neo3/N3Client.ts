import { rpc, tx, u, wallet } from "@cityofzion/neon-core-next";
import { GetContractStateResult, InvokeResult } from "@cityofzion/neon-core-next/lib/rpc";
import { Blockchain, N3Address, Network, SimpleMap, TokenClient } from "@demex-sdk/core";
import BigNumber from "bignumber.js";
import { N3NetworkConfig, PolynetworkConfig, TokensWithExternalBalance } from "../../env";
import { O3Types, O3Wallet } from "../../providers/o3Wallet";

export interface N3ClientOpts {
  polynetworkConfig: PolynetworkConfig;
  tokenClient: TokenClient;
  network: Network;
}

export interface LockO3DepositParams {
  token: TokensWithExternalBalance;

  toAddressHex: string;

  feeAmount: BigNumber;
  amount: BigNumber;

  signCompleteCallback?: () => void;
  o3Wallet: O3Wallet;
}

export interface N3Signer {
  scriptHash: string;
  sign: (txn: tx.Transaction, networkMagic?: number, k?: string | number) => Promise<tx.Transaction>;
}

export class N3Client {
  static blockchain: Blockchain = "Neo3";

  private rpcClient: rpc.RPCClient;

  private constructor(
    public readonly polynetworkConfig: PolynetworkConfig,
    public readonly tokenClient: TokenClient,
    public readonly network: Network,
  ) {
    const config = polynetworkConfig[N3Client.blockchain as keyof PolynetworkConfig] as N3NetworkConfig;
    const isValidNeoRpcUrl = config.rpcURL?.length > 0;
    this.rpcClient = isValidNeoRpcUrl ? new rpc.RPCClient(config.rpcURL) : null!;
  };

  public static instance(opts: N3ClientOpts) {
    const { polynetworkConfig, tokenClient, network } = opts;

    return new N3Client(polynetworkConfig, tokenClient, network);
  };

  public async getExternalBalances(address: string, whitelistDenoms?: string[]): Promise<TokensWithExternalBalance[]> {
    const tokens = await this.tokenClient.getAllTokens();

    const balances: SimpleMap<string> = await this.getAllN3Balances(address);
    const tokensWithBalance: TokensWithExternalBalance[] = [];

    for (const token of tokens) {
      if (!token.tokenAddress.match(/^[0-9a-f]+$/i)) continue;
      if (whitelistDenoms && !whitelistDenoms.includes(token.denom)) continue;
      const tokenScriptHash = u.reverseHex(token.tokenAddress);
      if (!balances[tokenScriptHash]) continue;

      tokensWithBalance.push({
        ...token,
        externalBalance: balances[tokenScriptHash],
      });
    }

    return tokensWithBalance;
  };

  public async getAllN3Balances(address: string): Promise<SimpleMap<string>> {
    const response: any = await this.rpcClient.execute(
      new rpc.Query({
        method: "getnep17balances",
        params: [address],
      })
    );

    const balances: SimpleMap<string> = {};
    for (const balanceResult of response?.balance ?? []) {
      balances[balanceResult.assethash.replace(/^0x/i, "")] = balanceResult.amount;
    }

    return balances;
  };

  public async lockO3Deposit(params: LockO3DepositParams): Promise<string> {
    const { feeAmount, toAddressHex, amount, token, o3Wallet } = params;
    if (!o3Wallet.isConnected()) {
      throw new Error("O3 wallet not connected. Please reconnect and try again.");
    }

    const nonce = Math.floor(Math.random() * 1000000);
    const networkConfig = this.getConfig();

    const lockProxyScriptHash = u.reverseHex(token.bridgeAddress);
    const tokenScriptHash = u.reverseHex(token.tokenAddress);
    const fromAddressHex = o3Wallet.address;

    const publicKeyOutput = (await o3Wallet.getPublicKeyOutput()) as O3Types.PublicKeyOutput;
    const accountScriptHash = N3Address.publicKeyToScriptHash(publicKeyOutput.publicKey);

    const feeAddress = feeAmount.isZero() ? "" : u.HexString.fromHex(networkConfig.feeAddress).toBase64();

    const args: O3Types.Argument[] = [
      { type: O3Types.ArgTypes.Hash160, value: tokenScriptHash },
      { type: O3Types.ArgTypes.Hash160, value: fromAddressHex },
      { type: O3Types.ArgTypes.ByteArray, value: u.HexString.fromHex(toAddressHex).toBase64() },
      { type: O3Types.ArgTypes.Integer, value: amount.toString(10) },
      { type: O3Types.ArgTypes.Integer, value: feeAmount.toString(10) },
      { type: O3Types.ArgTypes.ByteArray, value: feeAddress },
      { type: O3Types.ArgTypes.Integer, value: nonce.toString() },
    ];

    const result = await o3Wallet.getDAPI().invoke({
      operation: "lock",
      scriptHash: lockProxyScriptHash,
      args,
      network: o3Wallet.neoNetwork,
      signers: [
        {
          account: accountScriptHash,
          scopes: tx.WitnessScope.Global,
        },
      ],
    });
    return result.txid;
  };

  public async formatWithdrawalAddress(address: string): Promise<string> {
    const isValidAddress = wallet.isAddress(address);
    if (!isValidAddress) {
      throw new Error("invalid address");
    }
    const scriptHash = wallet.getScriptHashFromAddress(address);
    // return the little endian version of the address
    return u.reverseHex(scriptHash);
  };

  public async retrieveNEP17Info(address: string) {
    const result: [InvokeResult, InvokeResult, GetContractStateResult] = await this.rpcClient.executeAll([
      new rpc.Query({
        method: "invokefunction",
        params: [address, "decimals"],
      }),
      new rpc.Query({
        method: "invokefunction",
        params: [address, "symbol"],
      }),
      new rpc.Query({
        method: "getcontractstate",
        params: [address],
      }),
    ]);
    const [decimalRaw, symbolRaw, nameRaw] = result;
    let decimals: number = 0;
    let symbol: string = "";
    let name: string = "";
    if (typeof decimalRaw.stack[0].value === "string") {
      decimals = Number(decimalRaw.stack[0].value);
    }
    if (typeof symbolRaw.stack[0].value === "string") {
      symbol = Buffer.from(symbolRaw.stack[0].value, "base64").toString("ascii");
    }
    if (typeof nameRaw.manifest.name === "string") {
      name = nameRaw.manifest.name;
    }
    return { name, symbol, address, decimals };
  };

  getConfig() {
    return this.polynetworkConfig;
  };
}

export default N3Client;