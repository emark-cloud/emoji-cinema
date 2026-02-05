# Guidelines for Building GenLayer Projects

## Part 1: Building Intelligent Contracts

### 1.1 Contract Structure

Every GenLayer Intelligent Contract follows this structure:

```python
import genlayer.gl as gl
from genlayer import Address, TreeMap, u256
from genlayer.gl import allow_storage
from dataclasses import dataclass

@allow_storage
@dataclass
class MyDataClass:
    """Custom data types for storage must use @allow_storage decorator"""
    field1: str
    field2: u256  # Use u256 for numbers, NOT float

class MyContract(gl.Contract):
    # Storage fields - declared as class attributes with type hints
    items: TreeMap[str, MyDataClass]
    balances: TreeMap[Address, u256]

    def __init__(self, initial_param: str):
        """Constructor - called once during deployment"""
        self.initial_param = initial_param

    @gl.public.view
    def get_data(self, key: str) -> MyDataClass:
        """Read-only method - doesn't modify state"""
        return self.items[key]

    @gl.public.write
    def set_data(self, key: str, value: MyDataClass) -> None:
        """Write method - modifies state, requires transaction"""
        self.items[key] = value
```

### 1.2 Storage Types

| Type | Use Case |
|------|----------|
| `TreeMap[K, V]` | Key-value storage (like dict) |
| `DynArray[T]` | Growing list storage |
| `Array[T, N]` | Fixed-size array |
| `u256`, `i256`, `bigint` | Numbers (NO floats allowed) |
| `str`, `bool`, `bytes` | Primitive types |
| `Address` | Wallet/contract addresses |

**Critical Rules:**
- **NO floats** - Use `u256` for timestamps, amounts, etc.
- Custom dataclasses **must** have `@allow_storage` decorator
- Initialize nested TreeMaps explicitly:
  ```python
  self.nested[key] = gl.storage.inmem_allocate(TreeMap[Address, str])
  ```

### 1.3 Method Decorators

```python
@gl.public.view           # Read-only, free to call
@gl.public.write          # Modifies state, requires transaction
@gl.public.write.payable  # Accepts native token payments
```

### 1.4 Accessing Transaction Context

```python
import genlayer.gl as gl

sender = gl.message.sender_address    # Address of caller
value = gl.message.value              # Sent payment (for payable methods)
```

### 1.5 LLM Integration (AI Features)

```python
@gl.public.write
def ai_method(self, user_input: str) -> str:
    def make_decision() -> str:
        prompt = f"""Analyze: {user_input}
        Respond with exactly YES or NO."""
        result = gl.nondet.exec_prompt(prompt)
        return result.strip().upper()

    # Wrap non-deterministic AI in equivalence principle
    outcome = gl.eq_principle.strict_eq(make_decision)
    return outcome

@gl.public.write
def ai_evaluation(self, data: str) -> str:
    def evaluate() -> str:
        prompt = f"""Evaluate this data: {data}
        Return a JSON object with your assessment."""
        return gl.nondet.exec_prompt(prompt).strip()

    # Use non-comparative for subjective evaluations
    result = gl.eq_principle.prompt_non_comparative(
        evaluate,
        task="Evaluate the provided data",
        criteria="""
The AI response must:
1. Be valid JSON
2. Contain reasonable assessment based on the input
"""
    )
    return result
```

**Equivalence Principles:**
- `gl.eq_principle.strict_eq(fn)` - Validators must get exact same result
- `gl.eq_principle.prompt_comparative(fn, task, criteria)` - LLM compares leader output
- `gl.eq_principle.prompt_non_comparative(fn, task, criteria)` - LLM validates independently

### 1.6 Web Data Access

```python
@gl.public.write
def fetch_price(self, url: str) -> str:
    def get_data() -> str:
        # Fetch webpage content
        page = gl.nondet.web.render(url, mode='text')
        return page

    # Wrap in equivalence principle for consensus
    return gl.eq_principle.strict_eq(get_data)
```

### 1.7 Error Handling

```python
from genlayer.gl.vm import UserError

@gl.public.write
def guarded_method(self, room_id: str) -> None:
    if room_id not in self.rooms:
        raise UserError("Room not found")

    if self.rooms[room_id].resolved:
        raise UserError("Room already resolved")
```

### 1.8 Contract-to-Contract Calls

```python
other = gl.get_contract_at(Address("0x..."))
result = other.view().some_read_method()  # Read call
other.emit().some_write_method(arg1)      # Write call (transaction)
```

---

## Part 2: Building the Frontend

### 2.1 Project Setup

```bash
npx create-next-app@latest my-genlayer-app --typescript --tailwind
cd my-genlayer-app
npm install genlayer-js ethers viem
```

### 2.2 GenLayer Client Configuration

```typescript
// lib/genlayer.ts
import { createClient, abi } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { CalldataEncodable } from "genlayer-js/types";
import { createPublicClient, http, encodeFunctionData, type Address, type Hex } from "viem";

const { calldata, transactions } = abi;

export const GENLAYER_CONFIG = {
  chainId: 61999, // 0xF22F - StudioNet
  rpcUrl: "https://studio.genlayer.com/api",
  contractAddress: "0xYOUR_CONTRACT_ADDRESS",
};

// Create a read-only client
export function createReadClient() {
  return createClient({
    chain: studionet,
  });
}
```

### 2.3 Reading Contract State

```typescript
// Helper to convert Map to plain object recursively
function mapToObject(value: unknown): unknown {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    value.forEach((v, k) => {
      obj[k] = mapToObject(v);
    });
    return obj;
  }
  if (Array.isArray(value)) {
    return value.map(mapToObject);
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return value;
}

// Read contract state
export async function readContract<T>(
  functionName: string,
  args: CalldataEncodable[] = []
): Promise<T> {
  const client = createReadClient();

  const result = await client.readContract({
    address: GENLAYER_CONFIG.contractAddress as Address,
    functionName,
    args,
  });

  // Convert Map objects to plain objects
  return mapToObject(result) as T;
}

// Usage
const round = await readContract<Round>("get_round", [roundId]);
```

**Important:** GenLayer SDK returns `Map` objects and `bigint` for `u256`. The `mapToObject` helper handles both conversions recursively.

### 2.4 Writing Transactions

GenLayer writes go through a **consensus contract**, not directly to your contract:

```typescript
import { encodeFunctionData, parseEventLogs, type Address, type Hex } from "viem";

// StudioNet consensus contract address
const CONSENSUS_CONTRACT = "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575";

// Consensus contract ABI
const CONSENSUS_ABI = [
  {
    inputs: [
      { name: "_sender", type: "address" },
      { name: "_recipient", type: "address" },
      { name: "_numOfInitialValidators", type: "uint256" },
      { name: "_maxRotations", type: "uint256" },
      { name: "_txData", type: "bytes" },
    ],
    name: "addTransaction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "txId", type: "bytes32" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: true, name: "activator", type: "address" },
    ],
    name: "NewTransaction",
    type: "event",
  },
] as const;

export async function sendWriteTransaction(
  contractAddress: Address,
  functionName: string,
  args: CalldataEncodable[]
): Promise<string> {
  const accounts = await window.ethereum.request({
    method: "eth_accounts"
  }) as Address[];
  const senderAddress = accounts[0];

  // 1. Encode method call using GenLayer ABI
  const calldataObj = calldata.makeCalldataObject(functionName, args, undefined);
  const encodedCalldata = calldata.encode(calldataObj);

  // 2. Serialize using genlayer-js transactions helper
  const serializedData = transactions.serialize([encodedCalldata, false]) as Hex;

  // 3. Create addTransaction call to consensus contract
  const txData = encodeFunctionData({
    abi: CONSENSUS_ABI,
    functionName: "addTransaction",
    args: [
      senderAddress,
      contractAddress,
      BigInt(5),  // numOfInitialValidators
      BigInt(3),  // maxRotations
      serializedData,
    ],
  });

  // 4. Send via MetaMask
  const txHash = await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from: senderAddress,
      to: CONSENSUS_CONTRACT,
      data: txData,
      gas: "0x7A120",  // 500000
    }],
  }) as Hex;

  return txHash;
}
```

### 2.5 Waiting for Transaction Confirmation

GenLayer has 1-2 minute consensus delays. Poll for confirmation:

```typescript
export async function waitForTransactionReceipt(
  txHash: string,
  options: { interval?: number; maxRetries?: number } = {}
): Promise<TransactionReceipt> {
  const { interval = 2000, maxRetries = 30 } = options;

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    interval,
    retries: maxRetries,
  });

  const status = receipt.consensus_data?.final?.status ?? "FINALIZED";
  return { status, txId: txHash, ...receipt };
}
```

### 2.6 MetaMask Chain Configuration

```typescript
async function ensureCorrectChain(): Promise<void> {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN.chainId }],
    });
  } catch (error: any) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [GENLAYER_CHAIN],
      });
    }
  }
}
```

### 2.7 State Polling Pattern

Create a custom hook that polls contract state:

```typescript
// hooks/useRoom.ts
export function useRoom(contractAddress: string, roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoom = useCallback(async () => {
    try {
      const [roomData, votesData] = await Promise.all([
        genlayerRead(contractAddress, "get_room", [roomId]),
        genlayerRead(contractAddress, "get_votes", [roomId]),
      ]);

      // Convert Map to Object
      const roomObj = roomData instanceof Map
        ? Object.fromEntries(roomData)
        : roomData;

      setRoom(roomObj);
    } catch (error) {
      console.error("Failed to fetch room:", error);
    } finally {
      setLoading(false);
    }
  }, [contractAddress, roomId]);

  useEffect(() => {
    fetchRoom();

    // Poll every 5 seconds if room is active
    if (room && !room.resolved) {
      const interval = setInterval(fetchRoom, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchRoom, room?.resolved]);

  return { room, loading, refetch: fetchRoom };
}
```

### 2.8 Error Handling

Map technical errors to user-friendly messages:

```typescript
// lib/errors.ts
export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
}

export function mapToUserFriendlyError(error: any): UserFriendlyError {
  const msg = error?.message || String(error);

  if (msg.includes("User rejected")) {
    return {
      title: "Transaction Cancelled",
      message: "You rejected the transaction in your wallet.",
      action: "Try again when ready.",
    };
  }

  if (msg.includes("insufficient funds")) {
    return {
      title: "Insufficient Balance",
      message: "Your wallet doesn't have enough tokens.",
      action: "Add funds to your wallet.",
    };
  }

  // Add more mappings...

  return {
    title: "Something went wrong",
    message: msg,
  };
}
```

### 2.9 Type Definitions

```typescript
// types/room.ts
export interface Room {
  room_id: string;
  prompt: string;
  created_at: number | bigint;  // GenLayer returns bigint
  resolved: boolean;
  final_outcome: string;
}

// types/global.d.ts
declare global {
  interface Window {
    ethereum: {
      request(args: { method: string; params?: any[] }): Promise<any>;
      on(event: string, handler: (...args: any[]) => void): void;
    };
  }
}

export {};
```

### 2.10 Project Structure

```
my-genlayer-app/
├── my_contract.py              # Intelligent Contract
├── app/
│   ├── page.tsx               # Main page
│   ├── [id]/page.tsx          # Dynamic routes
│   └── globals.css            # Tailwind styles
├── components/
│   ├── ConnectWallet.tsx
│   └── ...
├── hooks/
│   ├── useRoom.ts             # State polling
│   └── useCountdown.ts        # Timer logic
├── lib/
│   ├── genlayer.ts            # RPC integration
│   ├── config.ts              # Constants
│   └── errors.ts              # Error mapping
├── types/
│   ├── global.d.ts            # Window.ethereum
│   └── room.ts                # Contract types
└── package.json
```

---

## Part 3: Key Patterns & Best Practices

### 3.1 Transaction Flow

```
Submit Tx → Wait Receipt → Poll Contract State → Verify Change → Update UI
```

Don't trust the receipt alone—poll the contract to confirm state changed.

### 3.2 Consensus Latency

GenLayer transactions take 1-2 minutes for consensus. Design your UI accordingly:
- Show loading states with progress indicators
- Disable buttons during pending transactions
- Auto-refresh data after confirmation

### 3.3 BigInt Handling

Always convert `bigint` to `number` at consumption points:

```typescript
const created = typeof data.created_at === 'bigint'
  ? Number(data.created_at)
  : data.created_at;
```

### 3.4 AI Prompt Design

For reliable consensus, write deterministic prompts:

```python
prompt = """You are evaluating a yes/no question.
Question: {question}
Votes: YES={yes_count}, NO={no_count}

Respond with EXACTLY one word: YES, NO, or UNDETERMINED.
No explanation. Just the word."""
```

### 3.5 Testing Contracts

Use GenLayer Studio for rapid iteration:
1. Deploy contract via Studio UI
2. Test methods interactively
3. Copy contract address to frontend config
4. Redeploy as needed during development

---

## Quick Reference

| Task | Contract | Frontend |
|------|----------|----------|
| Storage | `TreeMap`, `DynArray`, `u256` | N/A |
| Read data | `@gl.public.view` | `client.readContract()` |
| Write data | `@gl.public.write` | `addTransaction` to consensus contract |
| AI call | `gl.nondet.exec_prompt()` | N/A (backend only) |
| Consensus | `gl.eq_principle.prompt_non_comparative(fn, task=, criteria=)` | Wait & poll |
| Sender address | `gl.message.sender_address` | N/A |
| Errors | `raise UserError("msg")` | Map to friendly messages |

