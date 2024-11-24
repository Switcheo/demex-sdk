import { Carbon } from "@demex-sdk/codecs";
import { BN_ZERO, Network, NetworkConfig, NetworkConfigProvider, SWTHAddress, TokenClient, ZeroAddress, appendHexPrefix, stripHexPrefix } from "@demex-sdk/core";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { Blockchain, EthNetworkConfig, TokenInitInfo, TokensWithExternalBalance } from "../../env";
import { blockchainForChainId } from "../../util";
import ABIs from "./abis";

export interface ETHClientOpts {
  configProvider: NetworkConfigProvider;
  tokenClient: TokenClient;
  blockchain: typeof ETHClient.SUPPORTED_BLOCKCHAINS[number];
  network: Network;
}

interface ETHTxParams {
  gasPriceGwei?: BigNumber;
  gasLimit?: BigNumber;
  ethAddress: string;
  signer: ethers.Signer;
  nonce?: number
}

export interface BridgeParams {
  fromToken: Carbon.Coin.Token;
  toToken: Carbon.Coin.Token;
  amount: BigNumber;
  fromAddress: string;
  recoveryAddress: string;
  toAddress: string;
  feeAmount: BigNumber;
  gasPriceGwei?: BigNumber;
  gasLimit?: BigNumber;
  signer: ethers.Signer;
  signCompleteCallback?: () => void;
  nonce?: number;
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

export const FEE_MULTIPLIER = BigInt(2);

type SupportedBlockchains = Blockchain.BinanceSmartChain | Blockchain.Ethereum | Blockchain.Arbitrum | Blockchain.Polygon | Blockchain.Okc | Blockchain.Mantle | Blockchain.OP | Blockchain.Base;

export class ETHClient {
  static SUPPORTED_BLOCKCHAINS = [Blockchain.BinanceSmartChain, Blockchain.Ethereum, Blockchain.Arbitrum, Blockchain.Polygon, Blockchain.Okc, Blockchain.Mantle, Blockchain.OP, Blockchain.Base] as const;
  static BLOCKCHAIN_KEY = {
    [Blockchain.BinanceSmartChain]: "bsc",
    [Blockchain.Ethereum]: "eth",
    [Blockchain.Arbitrum]: "arbitrum",
    [Blockchain.Polygon]: "polygon",
    [Blockchain.Okc]: "okc",
    [Blockchain.Mantle]: 'mantle',
    [Blockchain.OP]: 'op',
    [Blockchain.Base]: 'base',
  };

  static BLOCKCHAINV2_MAPPING = {
    [Blockchain.BinanceSmartChain]: "Binance Smart Chain",
    [Blockchain.Ethereum]: "Ethereum",
    [Blockchain.Arbitrum]: "Arbitrum",
    [Blockchain.Polygon]: "Polygon",
    [Blockchain.Okc]: "OKC",
    [Blockchain.Mantle]: 'Mantle',
    [Blockchain.OP]: 'OP',
    [Blockchain.Base]: 'Base',
  };

  private constructor(
    public readonly configProvider: NetworkConfigProvider,
    public readonly blockchain: typeof ETHClient.SUPPORTED_BLOCKCHAINS[number],
    public readonly tokenClient: TokenClient,
    public readonly network: Network,
  ) { }

  public static instance(opts: ETHClientOpts) {
    const { configProvider, blockchain, tokenClient, network } = opts;

    if (!ETHClient.SUPPORTED_BLOCKCHAINS.includes(blockchain)) throw new Error(`unsupported blockchain - ${blockchain}`);

    return new ETHClient(configProvider, blockchain, tokenClient, network);
  }

  public async getExternalBalances(address: string, whitelistDenoms?: string[], version = "V1"): Promise<TokensWithExternalBalance[]> {
    const tokenQueryResults = await this.tokenClient.getAllTokens();
    const lockProxyAddress = this.getLockProxyAddress().toLowerCase();
    const tokens = tokenQueryResults.filter(
      (token) => {
        const isCorrectBlockchain =
          version === "V2"
            ?
            this.tokenClient.getBlockchainV2(token.denom) == ETHClient.BLOCKCHAINV2_MAPPING[this.blockchain]
            :
            blockchainForChainId(token.chainId.toNumber(), this.network) == this.blockchain
        return isCorrectBlockchain &&
          token.tokenAddress.length == 40 &&
          token.bridgeAddress.toLowerCase() == stripHexPrefix(lockProxyAddress) &&
          (!whitelistDenoms || whitelistDenoms.includes(token.denom)) &&
          this.verifyChecksum(appendHexPrefix(token.tokenAddress))
      }
    );
    const assetIds = tokens.map((token) => {
      return this.verifyChecksum(appendHexPrefix(token.tokenAddress));
    });

    const provider = this.getProvider();
    const contractAddress = this.getBalanceReaderAddress();
    const contract = new ethers.Contract(contractAddress, ABIs.balanceReader, provider);

    const checkSumAddr = ethers.getAddress(address);
    const balances = await contract.getBalances(checkSumAddr, assetIds);
    const TokensWithExternalBalance: TokensWithExternalBalance[] = [];
    for (let i = 0; i < assetIds.length; i++) {
      if (!tokens[i]) continue;

      TokensWithExternalBalance.push({
        ...tokens[i],
        externalBalance: balances[i].toString(),
      });
    }

    return TokensWithExternalBalance;
  }

  public async approveERC20(params: ApproveERC20Params): Promise<EthersTransactionResponse> {
    const { token, gasPriceGwei, gasLimit, ethAddress, spenderAddress, signer, amount } = params;
    const contractAddress = token.tokenAddress;

    const rpcProvider = this.getProvider();
    const contract = new ethers.Contract(contractAddress, ABIs.erc20, rpcProvider);

    const approvalAmount = BigInt(amount?.toString(10) ?? ethers.MaxUint256)

    const nonce = await this.getTxNonce(ethAddress, params.nonce, rpcProvider);
    const approveResultTx = await contract.connect(signer).approve(
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

  public async bridgeTokens(params: BridgeParams): Promise<EthersTransactionResponse> {
    const {
      fromToken,
      toToken,
      amount,
      toAddress,
      fromAddress,
      recoveryAddress,
      signer,
      gasPriceGwei,
      gasLimit,
      feeAmount,
      signCompleteCallback,
    } = params;

    const networkConfig = this.getNetworkConfig();
    const rpcProvider = this.getProvider();

    const recoveryAddrRegex = new RegExp(`^${networkConfig.bech32Prefix}[a-z0-9]{39}$`)
    if (!recoveryAddress.match(recoveryAddrRegex)) {
      throw new Error("Invalid recovery address");
    }

    const carbonNetwork = networkConfig.network;

    const fromTokenId = fromToken.id;
    const fromTokenAddress = appendHexPrefix(fromToken.tokenAddress);
    const toTokenDenom = toToken.denom;

    const recoveryAddressHex = ethers.hexlify(SWTHAddress.getAddressBytes(recoveryAddress, carbonNetwork));

    const fromAssetHash = ethers.hexlify(ethers.toUtf8Bytes(fromTokenId));
    const toAssetHash = ethers.hexlify(ethers.toUtf8Bytes(toTokenDenom));
    const nonce = await this.getTxNonce(fromAddress, params.nonce, rpcProvider);

    const contract = new ethers.Contract(this.getBridgeEntranceAddr(), ABIs.bridgeEntrance, rpcProvider);
    const feeAddress = appendHexPrefix(networkConfig.feeAddress);

    const tokenCreator = fromToken.creator;

    const targetAddressBytes = SWTHAddress.getAddressBytes(tokenCreator, carbonNetwork);
    const targetProxyHash = ethers.hexlify(targetAddressBytes);

    const ethAmount = fromToken.tokenAddress === stripHexPrefix(ZeroAddress) ? amount : BN_ZERO;
    const bridgeResultTx = await contract.connect(signer).lock(
      fromTokenAddress, // the asset to deposit (from) (0x00 if eth)
      [
        targetProxyHash, // _targetProxyHash
        recoveryAddressHex, // _recoveryAddress
        fromAssetHash, // _fromAssetHash
        feeAddress, // _feeAddress
        toAddress, // _toAddress the L1 address to bridge to
        toAssetHash, // _toAssetHash
      ],
      [
        amount.toString(10), // amount
        feeAmount.toString(10), // fee amount
        amount.toString(10),
      ], // callAmount
      {
        ...gasPriceGwei && ({ gasPrice: gasPriceGwei.shiftedBy(9).toString(10) }),
        ...gasLimit && ({ gasLimit: gasLimit.toString(10) }),
        nonce,
        value: ethAmount.toString(10),
      }
    );

    signCompleteCallback?.();

    return bridgeResultTx;
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
    const contract = new ethers.Contract(contractAddress, ABIs.lockProxy, rpcProvider);
    const lockResultTx = await contract.connect(signer).lock(
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

  public async getDepositContractAddress(swthBech32Address: string, ownerEthAddress: string): Promise<string> {
    const network = this.getNetworkConfig().network;
    const addressBytes = SWTHAddress.getAddressBytes(swthBech32Address, network);
    const swthAddress = ethers.hexlify(addressBytes);

    const provider = this.getProvider();
    const contractAddress = this.getLockProxyAddress();
    // logger("getDepositContractAddress lock proxy", contractAddress)
    const contract = new ethers.Contract(contractAddress, ABIs.lockProxy, provider);
    const walletAddress = await contract.getWalletAddress(ownerEthAddress, swthAddress, this.getWalletBytecodeHash());

    // logger("getDepositContractAddress", swthBech32Address, ownerEthAddress, walletAddress)

    return walletAddress;
  }

  public async sendDeposit(
    tokenWithExternalBalances: TokensWithExternalBalance,
    swthAddress: string,
    ethAddress: string,
    getSignatureCallback: (msg: string) => Promise<{ address: string; signature: string }>,
    overrideFee?: BigInt
  ) {
    const depositAddress = await this.getDepositContractAddress(swthAddress, ethAddress);

    // TODO: Remove overrideFee when hydrogen feeQuote is deployed on production
    let feeAmount: BigInt = await this.getDepositFeeAmount(tokenWithExternalBalances, depositAddress);
    if (overrideFee) {
      feeAmount = overrideFee;
    }

    const amount = BigInt(tokenWithExternalBalances.externalBalance);
    if (ethers.FixedNumber.fromValue(amount).lt(ethers.FixedNumber.fromValue(feeAmount))) {
      return "insufficient balance";
    }

    const networkConfig = this.getNetworkConfig();

    const assetId = appendHexPrefix(tokenWithExternalBalances.tokenAddress);
    const targetProxyHash = appendHexPrefix(this.getTargetProxyHash(tokenWithExternalBalances));
    const feeAddress = appendHexPrefix(networkConfig.feeAddress);
    const toAssetHash = ethers.hexlify(ethers.toUtf8Bytes(tokenWithExternalBalances.id));
    const nonce = Math.floor(Math.random() * 1000000000); // random nonce to prevent replay attacks
    const message = ethers.solidityPackedKeccak256(
      ["string", "address", "bytes", "bytes", "bytes", "uint256", "uint256", "uint256"],
      ["sendTokens", assetId, targetProxyHash, toAssetHash, feeAddress, amount, feeAmount, nonce]
    );
    // logger("sendDeposit message", message)

    const { address, signature } = await getSignatureCallback(message);
    const rsv = ethers.Signature.from(appendHexPrefix(signature));

    // logger("sign result", address, signature)

    const signatureResult = {
      owner: address,
      v: rsv.v.toString(),
      r: rsv.r,
      s: rsv.s,
    };

    const network = this.getNetworkConfig().network;
    const addressBytes = SWTHAddress.getAddressBytes(swthAddress, network);
    const swthAddressHex = ethers.hexlify(addressBytes);
    const body = {
      owner_address: signatureResult.owner,
      swth_address: swthAddressHex,
      token_address: assetId,
      token_creator: targetProxyHash,
      token_denom: tokenWithExternalBalances.denom,
      token_id: tokenWithExternalBalances.id,
      amount: amount.toString(),
      fee_amount: feeAmount.toString(),
      fee_address: feeAddress,
      nonce: nonce.toString(),
      v: signatureResult.v,
      r: signatureResult.r,
      s: signatureResult.s,
      blockchain: this.blockchain,
    };

    const result = await fetch(this.getPayerUrl() + "/deposit", { method: "POST", body: JSON.stringify(body) });
    // logger("fetch result", result)
    return result;
  }

  public async getDepositFeeAmount(token: Carbon.Coin.Token, depositAddress: string) {
    const feeInfo = await this.tokenClient.getFeeInfo(token.denom);
    if (!feeInfo.deposit_fee) {
      throw new Error("unsupported token");
    }
    if (blockchainForChainId(token.chainId.toNumber(), this.configProvider.getConfig().network) !== this.blockchain) {
      throw new Error("unsupported token");
    }

    let feeAmount = BigInt(feeInfo.deposit_fee);
    const walletContractDeployed = await this.isContract(depositAddress);
    if (!walletContractDeployed) {
      feeAmount = ethers.FixedNumber.fromValue(feeAmount).add(ethers.FixedNumber.fromValue(feeInfo.create_wallet_fee)).value;
    }

    return feeAmount;
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
    const networkConfig = this.getNetworkConfig();
    const addressBytes = SWTHAddress.getAddressBytes(token.creator, networkConfig.network);
    const addressHex = stripHexPrefix(ethers.hexlify(addressBytes));
    return addressHex;
  }

  public getProvider() {
    return new ethers.JsonRpcProvider(this.getProviderUrl());
  }

  public getNetworkConfig(): NetworkConfig {
    return this.configProvider.getConfig();
  }

  public getConfig(): EthNetworkConfig {
    const networkConfig = this.getNetworkConfig();
    const blockchain = this.blockchain as SupportedBlockchains;
    return networkConfig[ETHClient.BLOCKCHAIN_KEY[blockchain] as SupportedBlockchains];
  }

  public getPayerUrl() {
    return this.getConfig().payerURL;
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

  public getWalletBytecodeHash() {
    return this.getConfig().byteCodeHash;
  }

  public getBridgeEntranceAddr() {
    return this.getConfig().bridgeEntranceAddr as string;
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