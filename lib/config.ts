// GenLayer StudioNet configuration

export const STUDIONET_CONFIG = {
  chainId: 61999,
  chainIdHex: "0xF22F",
  rpcUrl: "https://studio.genlayer.com/api",
  consensusContract: "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575",
  networkName: "GenLayer StudioNet",
} as const;

// Contract address - update this after deploying via GenLayer Studio
export const CONTRACT_ADDRESS = "0x7efa6Ca59A3B4DF8eDC714178F872dC72e551E57";

// Polling intervals
export const POLL_INTERVAL = 5000; // 5 seconds
export const COUNTDOWN_INTERVAL = 1000; // 1 second
