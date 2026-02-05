"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";

export function ConnectWallet() {
  const [mounted, setMounted] = useState(false);
  const {
    address,
    isConnected,
    isConnecting,
    isCorrectNetwork,
    hasMetaMask,
    error,
    connect,
    disconnect,
    switchNetwork,
  } = useWallet();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Truncate address for display
  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  // Prevent hydration mismatch by showing loading state until mounted
  if (!mounted) {
    return (
      <div className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-32 h-10" />
    );
  }

  if (!hasMetaMask) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
      >
        Install MetaMask
      </a>
    );
  }

  if (isConnected && !isCorrectNetwork) {
    return (
      <button
        onClick={switchNetwork}
        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
      >
        Switch to StudioNet
      </button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {truncatedAddress}
        </span>
        <button
          onClick={disconnect}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
