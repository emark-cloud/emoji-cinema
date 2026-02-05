"use client";

import { useState, useEffect, useCallback } from "react";
import { STUDIONET_CONFIG } from "@/lib/config";

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: string | null;
  isCorrectNetwork: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    isCorrectNetwork: false,
    error: null,
  });

  // Check if MetaMask is installed
  const hasMetaMask = typeof window !== "undefined" && !!window.ethereum;

  // Connect wallet
  const connect = useCallback(async () => {
    if (!hasMetaMask) {
      setState((prev) => ({
        ...prev,
        error: "Please install MetaMask to continue",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request account access
      const accounts = (await window.ethereum!.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts.length > 0) {
        const address = accounts[0];
        const chainId = (await window.ethereum!.request({
          method: "eth_chainId",
        })) as string;

        setState({
          address,
          isConnected: true,
          isConnecting: false,
          chainId,
          isCorrectNetwork:
            chainId.toLowerCase() === STUDIONET_CONFIG.chainIdHex.toLowerCase(),
          error: null,
        });
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error:
          error instanceof Error ? error.message : "Failed to connect wallet",
      }));
    }
  }, [hasMetaMask]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      chainId: null,
      isCorrectNetwork: false,
      error: null,
    });
  }, []);

  // Switch to StudioNet
  const switchNetwork = useCallback(async () => {
    if (!hasMetaMask) return;

    try {
      await window.ethereum!.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: STUDIONET_CONFIG.chainIdHex }],
      });
    } catch (switchError: unknown) {
      // If the chain doesn't exist, add it
      if (
        switchError &&
        typeof switchError === "object" &&
        "code" in switchError &&
        (switchError as { code: number }).code === 4902
      ) {
        try {
          await window.ethereum!.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: STUDIONET_CONFIG.chainIdHex,
                chainName: STUDIONET_CONFIG.networkName,
                rpcUrls: [STUDIONET_CONFIG.rpcUrl],
                nativeCurrency: {
                  name: "GenLayer",
                  symbol: "GEN",
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          setState((prev) => ({
            ...prev,
            error:
              addError instanceof Error
                ? addError.message
                : "Failed to add network",
          }));
        }
      }
    }
  }, [hasMetaMask]);

  // Listen for account and chain changes
  useEffect(() => {
    if (!hasMetaMask) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accountList = accounts as string[];
      if (accountList.length === 0) {
        disconnect();
      } else {
        setState((prev) => ({
          ...prev,
          address: accountList[0],
          isConnected: true,
        }));
      }
    };

    const handleChainChanged = (chainId: unknown) => {
      const newChainId = chainId as string;
      setState((prev) => ({
        ...prev,
        chainId: newChainId,
        isCorrectNetwork:
          newChainId.toLowerCase() === STUDIONET_CONFIG.chainIdHex.toLowerCase(),
      }));
    };

    window.ethereum!.on("accountsChanged", handleAccountsChanged);
    window.ethereum!.on("chainChanged", handleChainChanged);

    // Check if already connected
    const checkConnection = async () => {
      try {
        const accounts = (await window.ethereum!.request({
          method: "eth_accounts",
        })) as string[];

        if (accounts.length > 0) {
          const chainId = (await window.ethereum!.request({
            method: "eth_chainId",
          })) as string;

          setState({
            address: accounts[0],
            isConnected: true,
            isConnecting: false,
            chainId,
            isCorrectNetwork:
              chainId.toLowerCase() ===
              STUDIONET_CONFIG.chainIdHex.toLowerCase(),
            error: null,
          });
        }
      } catch {
        // Silently fail if we can't check connection
      }
    };

    checkConnection();

    return () => {
      window.ethereum!.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum!.removeListener("chainChanged", handleChainChanged);
    };
  }, [hasMetaMask, disconnect]);

  return {
    ...state,
    hasMetaMask,
    connect,
    disconnect,
    switchNetwork,
  };
}
