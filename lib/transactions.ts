import { createClient, abi, chains } from "genlayer-js";
import { createWalletClient, createPublicClient, custom, http, encodeFunctionData } from "viem";
import { STUDIONET_CONFIG, CONTRACT_ADDRESS } from "./config";

// Use the studionet chain config from genlayer-js
const genlayerChain = chains.studionet;

// Use local API proxy to avoid CORS issues
const RPC_ENDPOINT = "/api/rpc";

// Transaction status types
export type TransactionStatus =
  | "idle"
  | "pending"
  | "confirming"
  | "success"
  | "error";

export interface TransactionState {
  status: TransactionStatus;
  hash?: string;
  error?: string;
}

// Calldata encodable type for GenLayer
type CalldataEncodable =
  | null
  | boolean
  | number
  | bigint
  | string
  | Uint8Array
  | CalldataEncodable[]
  | Map<string, CalldataEncodable>
  | { [key: string]: CalldataEncodable };


// Consensus contract ABI for addTransaction
const CONSENSUS_ABI = [
  {
    name: "addTransaction",
    type: "function",
    inputs: [
      { name: "sender", type: "address" },
      { name: "recipient", type: "address" },
      { name: "numOfInitialValidators", type: "uint256" },
      { name: "maxRotations", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

// Execute a write transaction using window.ethereum
export async function writeContract(
  account: `0x${string}`,
  method: string,
  args: CalldataEncodable[],
  onStatusChange?: (state: TransactionState) => void
): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  onStatusChange?.({ status: "pending" });

  try {
    // Create viem wallet client for signing with MetaMask
    const walletClient = createWalletClient({
      account: account,
      chain: genlayerChain,
      transport: custom(window.ethereum),
    });

    // Create viem public client for reading
    const publicClient = createPublicClient({
      chain: genlayerChain,
      transport: http(STUDIONET_CONFIG.rpcUrl),
    });

    // Step 1: Encode the method call using genlayer-js calldata
    const calldataObj = abi.calldata.makeCalldataObject(method, args, undefined);
    const encodedCalldata = abi.calldata.encode(calldataObj);

    // Step 2: Serialize with leaderOnly=false
    const serializedData = abi.transactions.serialize([encodedCalldata, false]);

    // Step 3: Encode the addTransaction call to consensus contract
    const txData = encodeFunctionData({
      abi: CONSENSUS_ABI,
      functionName: "addTransaction",
      args: [
        account,                                    // sender
        CONTRACT_ADDRESS as `0x${string}`,          // recipient (our contract)
        BigInt(genlayerChain.defaultNumberOfInitialValidators), // numOfInitialValidators
        BigInt(genlayerChain.defaultConsensusMaxRotations),     // maxRotations
        serializedData,                             // data
      ],
    });

    // Get the current nonce
    const nonce = await publicClient.getTransactionCount({ address: account });

    // Send transaction via MetaMask to the consensus contract
    const hash = await walletClient.sendTransaction({
      chain: genlayerChain,
      to: STUDIONET_CONFIG.consensusContract as `0x${string}`,
      data: txData,
      value: BigInt(0),
      nonce,
      gas: BigInt(200000),
    });

    onStatusChange?.({ status: "confirming", hash });

    // Create GenLayer client for waiting on receipt (use proxy)
    const glClient = createClient({
      endpoint: RPC_ENDPOINT,
    });

    // Wait for confirmation - returns GenLayerTransaction
    const receipt = await glClient.waitForTransactionReceipt({
      hash: hash as `0x${string}` & { length: 66 }
    });

    // Check if transaction succeeded
    // GenLayer result codes: 0=IDLE, 1=AGREE, 6=MAJORITY_AGREE are success
    const resultName = receipt.resultName;
    const result = receipt.result;
    const isSuccess =
      resultName === "SUCCESS" ||
      resultName === "MAJORITY_AGREE" ||
      resultName === "AGREE" ||
      result === 0 ||
      result === 1 ||
      result === 6;

    if (isSuccess) {
      onStatusChange?.({ status: "success", hash });
      return hash;
    } else {
      throw new Error(
        `Transaction failed with result: ${resultName || result}`
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Transaction failed";
    onStatusChange?.({ status: "error", error: errorMessage });
    throw error;
  }
}

// Poll for transaction result using getTransaction
export async function pollTransactionStatus(
  hash: string,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<boolean> {
  const client = createClient({
    endpoint: RPC_ENDPOINT,
  });

  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Use getTransaction which returns GenLayerTransaction
      // Cast hash to the expected type
      const tx = await client.getTransaction({
        hash: hash as `0x${string}` & { length: 66 },
      });
      const resultName = tx.resultName;
      const isSuccess =
        resultName === "SUCCESS" ||
        resultName === "MAJORITY_AGREE" ||
        tx.result === 0;
      if (tx && isSuccess) {
        return true;
      }
    } catch {
      // Transaction not found yet, continue polling
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}
