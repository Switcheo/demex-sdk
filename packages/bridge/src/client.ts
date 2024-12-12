import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import * as ABIs from "./abi";

export interface AxelarBridgeClientOpts {
}

export interface DepositParams {
  contractAddress: string;
  senderAddress: string;
  receiverAddress: string;
  amount: BigNumber;
  depositTokenExternalAddress?: string;
  rpcUrl: string;
  gasPriceGwei?: BigNumber;
  gasLimit?: BigNumber;
  signer: ethers.Signer;
  nonce?: number;
  isNativeTokenDeposit?: boolean;
}

export interface EthersTransactionResponse extends ethers.Transaction {
  wait: () => Promise<ethers.Transaction>;
}

export class AxelarBridgeClient {
  private constructor() { }

  public static instance(opts: AxelarBridgeClientOpts) {
    return new AxelarBridgeClient();
  }

  public async deposit(params: DepositParams): Promise<EthersTransactionResponse> {
    const {
      contractAddress,
      senderAddress,
      receiverAddress,
      depositTokenExternalAddress,
      isNativeTokenDeposit = false,
      amount,
      signer,
      nonce,
      gasPriceGwei,
      gasLimit,
    } = params;
    const abi = isNativeTokenDeposit ? ABIs.nativeDepositer : ABIs.axelarBridge;
    const contract = new ethers.Contract(contractAddress, abi, signer);

    const txParams = {
      nonce,
      ...(gasPriceGwei && { gasPrice: gasPriceGwei.shiftedBy(9).toString(10) }),
      ...(gasLimit && { gasLimit: gasLimit.toString(10) }),
      ...(isNativeTokenDeposit && { value: amount.toString(10) }),
    };

    if (isNativeTokenDeposit) {
      return await contract.deposit!(
        senderAddress, // tokenSender
        receiverAddress, // carbonReceiver bech32Address
        txParams
      );
    }

    return await contract.deposit!(
      senderAddress, // tokenSender
      receiverAddress, // carbonReceiver bech32Address
      depositTokenExternalAddress, // asset
      amount.toString(10),
      txParams
    );
  }
}

export default AxelarBridgeClient;
