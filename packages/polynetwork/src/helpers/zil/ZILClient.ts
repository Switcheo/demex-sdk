import { Carbon } from "@demex-sdk/codecs";
import { appendHexPrefix, Blockchain, Network, stripHexPrefix, SWTHAddress, TokenClient, ZeroAddress } from "@demex-sdk/core";
import { Transaction, Wallet } from "@zilliqa-js/account";
import { CallParams, Contract, Value } from "@zilliqa-js/contract";
import { BN, bytes, Long } from "@zilliqa-js/util";
import { fromBech32Address, Zilliqa } from "@zilliqa-js/zilliqa";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { PolynetworkConfig, TokensWithExternalBalance, ZilNetworkConfig } from "../../env";

const uint128Max = "340282366920938463463374607431768211356";
const zeroAddress = stripHexPrefix(ZeroAddress);

export declare type WalletProvider = Omit<
  Zilliqa & {
    wallet: Wallet & {
      net: string;
      defaultAccount: {
        base16: string;
        bech32: string;
      };
    };
  }, // ugly hack for zilpay non-standard API
  "subscriptionBuilder"
>;

export interface ZILClientOpts {
  polynetworkConfig: PolynetworkConfig;
  tokenClient: TokenClient;
  network: Network;
}

interface ZILTxParams {
  gasPrice: BigNumber;
  gasLimit: BigNumber;
  zilAddress: string;
  signer: WalletProvider | string;
}

export interface ZILLockParams extends ZILTxParams {
  address: Uint8Array;
  amount: BigNumber;
  token: Carbon.Coin.Token;
  signCompleteCallback?: () => void;
}

export interface ApproveZRC2Params extends ZILTxParams {
  token: Carbon.Coin.Token;
  spenderAddress?: string;
  signCompleteCallback?: () => void;
}

export enum BatchRequestType {
  Balance = "balance",
  TokenBalance = "tokenBalance",
  TokenAllowance = "tokenAllowance",
}
interface BatchRequestItem {
  id: string;
  jsonrpc: string;
  method: string;
  params: any[];
}

interface BatchRequest {
  type: string;
  item: BatchRequestItem;
}

interface BatchResponse {
  request: BatchRequest;
  result: any;
}

export const tokenBalanceBatchRequest = (tokenAddress: string, walletAddress: string): BatchRequest => {
  return {
    type: BatchRequestType.TokenBalance,
    item: {
      id: "1",
      jsonrpc: "2.0",
      method: "GetSmartContractSubState",
      params: [
        tokenAddress, // hex token address
        "balances",
        [walletAddress],
      ],
    },
  };
};

export const balanceBatchRequest = (address: string): BatchRequest => {
  return {
    type: BatchRequestType.Balance,
    item: {
      id: "1",
      jsonrpc: "2.0",
      method: "GetBalance",
      params: [address],
    },
  };
};

export class ZILClient {
  static blockchain: Blockchain = "Zilliqa";

  private walletProvider?: WalletProvider; // zilpay

  private constructor(
    public readonly polynetworkConfig: PolynetworkConfig,
    public readonly tokenClient: TokenClient,
    public readonly network: Network,
  ) { };

  public static instance(opts: ZILClientOpts) {
    const { polynetworkConfig, tokenClient, network } = opts;

    return new ZILClient(polynetworkConfig, tokenClient, network);
  }

  public async getExternalBalances(address: string, whitelistDenoms?: string[], version = "V1"): Promise<TokensWithExternalBalance[]> {
    const tokenQueryResults = await this.tokenClient.getAllTokens();
    const tokens = tokenQueryResults.filter((token: Carbon.Coin.Token) => {
      const isCorrectBlockchain = this.tokenClient.getBlockchain(token.denom) === ZILClient.blockchain;
      return isCorrectBlockchain && token.tokenAddress.length == 40 && (!whitelistDenoms || whitelistDenoms.includes(token.denom))
    });

    const requests = tokens.map((token: Carbon.Coin.Token) =>
      token.tokenAddress === zeroAddress
        ? balanceBatchRequest(address.replace(/^0x/i, ""))
        : tokenBalanceBatchRequest(token.tokenAddress, address)
    );
    const response = await fetch(this.getProviderUrl(), {
      method: "post",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requests.flatMap((request: BatchRequest) => request.item)),
    });
    const results = await response.json() as BatchResponse;

    const TokensWithExternalBalanceArr: TokensWithExternalBalance[] = [];
    if (!Array.isArray(results)) {
      return TokensWithExternalBalanceArr;
    }

    results.forEach((result: any, i: number) => {
      const token = tokens[i];
      if (token) {
        TokensWithExternalBalanceArr.push({
          ...token,
          externalBalance: result.result?.balance ?? result.result.balances?.[address] ?? '0',
          // result.result?.balance - zil balance query result
          // result.result.balances?.[address] - zrc2 balance query result
        });
      }
    });

    return TokensWithExternalBalanceArr;
  }

  public async formatWithdrawalAddress(bech32Address: string): Promise<string> {
    // const isValidAddress = isValidChecksumAddress(bech32Address)
    // if (!isValidAddress) {
    //   throw new Error("invalid address")
    // }
    return fromBech32Address(bech32Address).toLowerCase().substr(2);
  }

  // see examplesV2/zil_client.ts on how to confirm the transactions
  // to confirm the zilpay method, use :
  //  const lock_tx = await zilclient.lockDeposit()
  //  const emptyTx = new Transaction({ toAddr: toAddr }, new HTTPProvider(sdk.zil.getProviderUrl())
  //  const confirmedTxn = await emptyTx.confirm(lock_tx.id)
  //
  // to confirm the privatekey method use :
  //  const lock_tx = await zilclient.lockDeposit()
  //  const txn = await lock_tx.confirm(lock_tx.id)
  private async callContract(
    contract: Contract,
    transition: string,
    args: Value[],
    params: CallParams,
    toDs?: boolean
  ): Promise<Transaction> {
    if (this.walletProvider) {
      // zilpay
      const txn = await (contract as any).call(transition, args, params, toDs);
      txn.id = txn.ID;
      txn.isRejected = function (this: { errors: any[]; exceptions: any[] }) {
        return this.errors.length > 0 || this.exceptions.length > 0;
      };
      return txn;
    } else {
      // default; e.g. privatekey
      return await contract.callWithoutConfirm(transition, args, params, toDs);
    }
  }

  public async approveZRC2(params: ApproveZRC2Params) {
    const { token, gasPrice, gasLimit, zilAddress, spenderAddress, signer } = params;
    const contractAddress = token.tokenAddress;

    let zilliqa;
    if (typeof signer === "string") {
      zilliqa = new Zilliqa(this.getProviderUrl());
      zilliqa.wallet.addByPrivateKey(signer);
    } else if (signer) {
      zilliqa = new Zilliqa(this.getProviderUrl(), signer.provider);
      this.walletProvider = signer;
    } else {
      zilliqa = new Zilliqa(this.getProviderUrl());
    }
    const deployedContract = (this.walletProvider || zilliqa).contracts.at(contractAddress);
    const balanceAndNonceResp = await zilliqa.blockchain.getBalance(stripHexPrefix(zilAddress));
    if (balanceAndNonceResp.error !== undefined) {
      throw new Error(balanceAndNonceResp.error.message);
    }

    const nonce = balanceAndNonceResp.result.nonce + 1;
    const version = bytes.pack(this.getConfig().chainId, Number(1));

    const callParams = {
      version: version,
      nonce: nonce,
      amount: new BN(0),
      gasPrice: new BN(gasPrice.toString()),
      gasLimit: Long.fromString(gasLimit.toString()),
    };

    const transitionParams = [
      {
        vname: "spender",
        type: "ByStr20",
        // TODO: Check if bridgeAddress corresponds to carbon token lock_proxy_hash
        value: spenderAddress ?? appendHexPrefix(token.bridgeAddress),
      },
      {
        vname: "amount",
        type: "Uint128",
        value: uint128Max,
      },
    ];

    const data = {
      _tag: "IncreaseAllowance",
      params: [...transitionParams],
    };

    const callTx = await this.callContract(deployedContract, data._tag, data.params, callParams, true);
    return callTx;
  }

  public async checkAllowanceZRC2(token: Carbon.Coin.Token, owner: string, spender: string) {
    const contractAddress = appendHexPrefix(token.tokenAddress);
    const zilliqa = new Zilliqa(this.getProviderUrl());
    const resp = await zilliqa.blockchain.getSmartContractSubState(contractAddress, "allowances", [owner, spender]);
    if (resp.error !== undefined) {
      throw new Error(resp.error.message);
    }

    if (resp.result === null) {
      return new BigNumber("0");
    }

    return new BigNumber(resp.result.allowances[owner][spender]);
  }

  public async lockDeposit(params: ZILLockParams) {
    const { address, amount, token, gasPrice, gasLimit, zilAddress, signer } = params;
    const networkConfig = this.getNetworkConfig();

    const assetId = appendHexPrefix(token.tokenAddress);
    const targetProxyHash = appendHexPrefix(this.getTargetProxyHash(token));
    const feeAddress = appendHexPrefix(networkConfig.feeAddress);
    const toAssetHash = ethers.hexlify(ethers.toUtf8Bytes(token.id));
    const swthAddress = ethers.hexlify(address);
    // TODO: Check if bridgeAddress corresponds to carbon token lock_proxy_hash
    const contractAddress = appendHexPrefix(token.bridgeAddress);

    let zilliqa;
    if (typeof signer === "string") {
      zilliqa = new Zilliqa(this.getProviderUrl());
      zilliqa.wallet.addByPrivateKey(signer);
    } else if (signer) {
      zilliqa = new Zilliqa(this.getProviderUrl(), signer.provider);
      this.walletProvider = signer;
    } else {
      zilliqa = new Zilliqa(this.getProviderUrl());
    }

    const deployedContract = (this.walletProvider || zilliqa).contracts.at(contractAddress);
    const balanceAndNonceResp = await zilliqa.blockchain.getBalance(stripHexPrefix(zilAddress));
    if (balanceAndNonceResp.error !== undefined) {
      throw new Error(balanceAndNonceResp.error.message);
    }

    const nonce = balanceAndNonceResp.result.nonce + 1;
    const version = bytes.pack(this.getConfig().chainId, Number(1));

    let nativeAmt = new BN(0);
    if (token.tokenAddress == zeroAddress) {
      nativeAmt = new BN(amount.toString());
    }

    const callParams = {
      version: version,
      nonce: nonce,
      amount: nativeAmt,
      gasPrice: new BN(gasPrice.toString()),
      gasLimit: Long.fromString(gasLimit.toString()),
    };

    const transitionParams = [
      {
        vname: "tokenAddr",
        type: "ByStr20",
        value: assetId,
      },
      {
        vname: "targetProxyHash",
        type: "ByStr",
        value: targetProxyHash,
      },
      {
        vname: "toAddress",
        type: "ByStr",
        value: swthAddress,
      },
      {
        vname: "toAssetHash",
        type: "ByStr",
        value: toAssetHash,
      },
      {
        vname: "feeAddr",
        type: "ByStr",
        value: feeAddress,
      },
      {
        vname: "amount",
        type: "Uint256",
        value: amount.toString(),
      },
      {
        vname: "feeAmount",
        type: "Uint256",
        value: "0",
      },
    ];

    const data = {
      _tag: "lock",
      params: [...transitionParams],
    };

    const callTx = await this.callContract(deployedContract, data._tag, data.params, callParams, true);
    return callTx;
  }

  public async retrieveZRC2Info(address: string) {
    const zilliqa = new Zilliqa(this.getProviderUrl());
    const smartContractInit = await zilliqa.blockchain.getSmartContractInit(address);
    const mask = ["name", "_this_address", "symbol", "decimals"];
    const result = smartContractInit.result;
    if (result === undefined) throw new Error(`token contract ${address} is not found`);
    const intermediate = result
      .filter(({ vname }) => mask.includes(vname))
      .reduce(
        (prev, cur) => ({ ...prev, [cur.vname === "_this_address" ? "address" : cur.vname]: cur.value }),
        <{ name: string; symbol: string; decimals: string; address: string }>{}
      );
    return { ...intermediate, decimals: Number(intermediate.decimals) };
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

  public getConfig(): ZilNetworkConfig {
    const networkConfig = this.getNetworkConfig();
    return networkConfig[ZILClient.blockchain as keyof PolynetworkConfig] as ZilNetworkConfig;
  }

  public getProviderUrl() {
    return this.getConfig().rpcURL;
  }
}

export default ZILClient;