import { createClient } from "genlayer-js";
import { CONTRACT_ADDRESS } from "./config";

// Use local API proxy to avoid CORS issues with GenLayer RPC
const RPC_ENDPOINT = typeof window !== "undefined"
  ? "/api/rpc"  // Browser: use local proxy
  : "https://studio.genlayer.com/api";  // Server: direct access

// Create read-only GenLayer client
export const genlayerClient = createClient({
  endpoint: RPC_ENDPOINT,
});

// Try to extract a string representation from any value
function toStringValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return null;

  // Handle objects with common address/value properties
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    // Try common property names for address-like objects
    for (const key of ["value", "address", "_value", "hex", "_hex"]) {
      if (typeof obj[key] === "string") {
        return obj[key] as string;
      }
    }

    // Try toString() if it's not the default [object Object]
    if (typeof obj.toString === "function") {
      const str = obj.toString();
      if (str && !str.includes("[object")) {
        return str;
      }
    }
  }

  return null;
}

// Check if value looks like a GenLayer Address object (has hex-like structure)
function isAddressLike(value: unknown): boolean {
  const str = toStringValue(value);
  return str !== null && str.startsWith("0x");
}

// Convert Map objects to plain objects (GenLayer SDK returns Maps)
export function mapToObject(value: unknown): unknown {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    value.forEach((v, k) => {
      obj[String(k)] = mapToObject(v);
    });
    return obj;
  }

  if (Array.isArray(value)) {
    return value.map(mapToObject);
  }

  // Handle GenLayer Address objects - convert to plain string
  if (isAddressLike(value)) {
    return toStringValue(value);
  }

  if (value !== null && typeof value === "object") {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      obj[k] = mapToObject(v);
    }
    return obj;
  }

  return value;
}

// Convert bigint to number safely
export function bigintToNumber(value: unknown): number {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "number") {
    return value;
  }
  return 0;
}

// Convert any value to string, handling GenLayer Address objects
export function toAddressString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Try common property names for address-like objects
    for (const key of ["value", "address", "_value", "hex", "_hex"]) {
      if (typeof obj[key] === "string") {
        return obj[key] as string;
      }
    }
    // Try toString() if it's not the default [object Object]
    if (typeof obj.toString === "function") {
      const str = obj.toString();
      if (str && !str.includes("[object")) {
        return str;
      }
    }
  }

  return "";
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

// Read contract state
export async function readContract<T>(
  method: string,
  args: CalldataEncodable[] = []
): Promise<T> {
  const result = await genlayerClient.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: method,
    args,
  });

  return mapToObject(result) as T;
}

// Get contract address
export function getContractAddress(): string {
  return CONTRACT_ADDRESS;
}
