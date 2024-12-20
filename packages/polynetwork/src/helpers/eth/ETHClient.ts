import { Carbon } from "@demex-sdk/codecs";
import { Network, SWTHAddress, TokenClient, appendHexPrefix, stripHexPrefix } from "@demex-sdk/core";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { EVMChain, evmChains, EthNetworkConfig, PolynetworkConfig, TokenInitInfo, TokensWithExternalBalance } from "../../env";
import ABIs from "./abis";

export interface ETHClientOpts {
  tokenClient: TokenClient;
  blockchain: EVMChain;
  network: Network;
  polynetworkConfig: PolynetworkConfig;
}

interface ETHTxParams {
  gasPriceGwei?: BigNumber;
  gasLimit?: BigNumber;
  ethAddress: string;
  signer: ethers.Signer;
  nonce?: number
}

export interface LockParams extends ETHTxParams {
  address: Uint8Array;
  amount: BigNumber;
  token: Carbon.Coin.Token;
  signCompleteCallback?: () => void;
}
export interface ApproveERC20Params extends ETHTxParams {
  token: Carbon.Coin.Token;
  spenderAddress?: string;
  amount?: BigNumber;
  signCompleteCallback?: () => void;
}

export interface EthersTransactionResponse extends ethers.Transaction {
  wait: () => Promise<ethers.Transaction>;
}

export class ETHClient {
  private constructor(
    public readonly polynetworkConfig: PolynetworkConfig,
    public readonly blockchain: EVMChain,
    public readonly tokenClient: TokenClient,
    public readonly network: Network,
  ) { }

  public static instance(opts: ETHClientOpts) {
    const { blockchain, tokenClient, network, polynetworkConfig } = opts;

    if (!evmChains.has(blockchain)) throw new Error(`unsupported blockchain - ${blockchain}`);

    return new ETHClient(polynetworkConfig, blockchain, tokenClient, network);
  }

  public async getExternalBalances(address: string, whitelistDenoms?: string[]): Promise<TokensWithExternalBalance[]> {
    const tokenQueryResults = await this.tokenClient.getAllTokens();
    const lockProxyAddress = this.getLockProxyAddress().toLowerCase();
    const tokens = tokenQueryResults.filter((token: Carbon.Coin.Token) => {
      const isCorrectBlockchain = this.tokenClient.getBlockchain(token.denom) === this.blockchain;
      return isCorrectBlockchain &&
        token.tokenAddress.length == 40 &&
        token.bridgeAddress.toLowerCase() == stripHexPrefix(lockProxyAddress) &&
        (!whitelistDenoms || whitelistDenoms.includes(token.denom)) &&
        this.verifyChecksum(appendHexPrefix(token.tokenAddress));
    });
    const assetIds = tokens.map((token: Carbon.Coin.Token) => {
      return this.verifyChecksum(appendHexPrefix(token.tokenAddress));
    });

    const provider = this.getProvider();
    const contractAddress = this.getBalanceReaderAddress();
    const contract = new ethers.Contract(contractAddress, ABIs.balanceReader, provider);

    const checkSumAddr = ethers.getAddress(address);
    const balances = await contract.getBalances(checkSumAddr, assetIds);
    const TokensWithExternalBalanceArr: TokensWithExternalBalance[] = [];
    for (let i = 0; i < assetIds.length; i++) {
      if (!tokens[i]) continue;

      TokensWithExternalBalanceArr.push({
        ...tokens[i],
        externalBalance: balances[i].toString(),
      });
    }

    return TokensWithExternalBalanceArr;
  }

  public async approveERC20(params: ApproveERC20Params): Promise<EthersTransactionResponse> {
    const { token, gasPriceGwei, gasLimit, ethAddress, spenderAddress, signer, amount } = params;
    const contractAddress = token.tokenAddress;

    const rpcProvider = this.getProvider();
    const contract = new ethers.Contract(contractAddress, ABIs.erc20, signer);

    const approvalAmount = BigInt(amount?.toString(10) ?? ethers.MaxUint256)

    const nonce = await this.getTxNonce(ethAddress, params.nonce, rpcProvider);
    const approveResultTx = await contract.approve(
      ethers.Typed.address(spenderAddress ?? token.bridgeAddress),
      approvalAmount, {
      nonce,
      ...gasPriceGwei && ({ gasPrice: gasPriceGwei.shiftedBy(9).toString(10) }),
      ...gasLimit && ({ gasLimit: gasLimit.toString(10) }),
    });

    return approveResultTx;
  }

  public async checkAllowanceERC20(token: Carbon.Coin.Token, owner: string, spender: string) {
    const contractAddress = token.tokenAddress;
    const rpcProvider = this.getProvider();
    const contract = new ethers.Contract(contractAddress, ABIs.erc20, rpcProvider);
    const allowance = await contract.allowance(owner, spender);
    return new BigNumber(allowance.toString());
  }

  public async lockDeposit(params: LockParams): Promise<EthersTransactionResponse> {
    const { address, token, amount, gasPriceGwei, gasLimit, ethAddress, signer, signCompleteCallback } = params;

    if (gasLimit?.lt(150000)) {
      throw new Error("Minimum gas required: 150,000");
    }

    const networkConfig = this.getNetworkConfig();

    const assetId = appendHexPrefix(token.tokenAddress);
    const targetProxyHash = appendHexPrefix(this.getTargetProxyHash(token));
    const feeAddress = appendHexPrefix(networkConfig.feeAddress);
    const toAssetHash = ethers.hexlify(ethers.toUtf8Bytes(token.id));

    const swthAddress = ethers.hexlify(address);
    const contractAddress = this.getLockProxyAddress();

    const rpcProvider = this.getProvider();

    const nonce: number = await this.getTxNonce(ethAddress, params.nonce, rpcProvider);
    const contract = new ethers.Contract(contractAddress, ABIs.lockProxy, signer);
    const lockResultTx = await contract.lock(
      assetId, // _assetHash
      targetProxyHash, // _targetProxyHash
      swthAddress, // _toAddress
      toAssetHash, // _toAssetHash
      feeAddress, // _feeAddress
      [
        // _values
        amount.toString(), // amount
        "0", // feeAmount
        amount.toString(), // callAmount
      ],
      {
        nonce,
        value: "0",
        ...gasPriceGwei && ({ gasPrice: gasPriceGwei.shiftedBy(9).toString(10) }),
        ...gasLimit && ({ gasLimit: gasLimit.toString(10) }),

        // add tx value for ETH deposits, omit if ERC20 token
        ...(token.tokenAddress === "0000000000000000000000000000000000000000" && {
          value: amount.toString(),
        }),
      }
    );

    signCompleteCallback?.();

    return lockResultTx;
  }

  public async isContract(address: string) {
    const provider = this.getProvider();
    const code = await provider.getCode(address);
    // non-contract addresses should return 0x
    return code !== "0x";
  }

  public async retrieveERC20Info(address: string): Promise<TokenInitInfo> {
    const provider = this.getProvider();
    const contract = new ethers.Contract(address, ABIs.erc20, provider);
    const decimals = await contract.decimals();
    const name = await contract.name();
    const symbol = await contract.symbol();

    return { address, decimals, name, symbol };
  }

  public async formatWithdrawalAddress(address: string): Promise<string> {
    const isValidAddress = ethers.isAddress(address);
    if (!isValidAddress) {
      throw new Error("invalid address");
    }
    const isContract = await this.isContract(address);
    if (isContract) {
      throw new Error("cannot withdraw to contract address");
    }
    return address.substr(2);
  }

  public getEthSigner(privateKey: ethers.BytesLike): ethers.Wallet {
    return new ethers.Wallet(new ethers.SigningKey(privateKey), this.getProvider());
  }

  public async sign(message: string, privateKey: ethers.BytesLike) {
    const ethWallet = this.getEthSigner(privateKey);
    const messageBytes = ethers.getBytes(message);
    const signatureBytes = await ethWallet.signMessage(messageBytes);
    const signature = ethers.hexlify(signatureBytes).replace(/^0x/g, "");
    return {
      address: ethWallet.address,
      signature,
    };
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

  public getProvider() {
    return new ethers.JsonRpcProvider(this.getProviderUrl());
  }

  public getNetworkConfig(): PolynetworkConfig {
    return this.polynetworkConfig;
  }

  public getConfig(): EthNetworkConfig {
    const networkConfig = this.getNetworkConfig();
    return networkConfig[this.blockchain as EVMChain];
  }

  public getProviderUrl() {
    return this.getConfig().rpcURL;
  }

  public getLockProxyAddress() {
    return this.getConfig().lockProxyAddr;
  }

  public getBalanceReaderAddress() {
    return this.getConfig().balanceReader;
  }

  /**
   * verify that address is a valid checksum.
   * Returns checksum address if valid, returns undefined if invalid
   * @input address to be verified
   */
  public verifyChecksum(input: string): string | undefined {
    try {
      return ethers.getAddress(input);
    } catch {
      // empty catch
    }
  }

  public async getTxNonce(ethAddress: string, customNonce?: number, provider?: ethers.JsonRpcProvider): Promise<number> {
    if (customNonce && isFinite(customNonce)) return customNonce;

    const rpcProvider = provider ?? this.getProvider();
    const nonce = await rpcProvider.getTransactionCount(ethAddress);
    return nonce;
  }
}

export default ETHClient;