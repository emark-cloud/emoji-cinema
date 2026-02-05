// Map contract errors to user-friendly messages

export function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  // Contract-specific errors
  if (message.includes("Emoji description must contain at least 3 emojis")) {
    return "Please add at least 3 emojis to describe the movie";
  }

  if (message.includes("Emoji description must contain at most 8 emojis")) {
    return "Please use no more than 8 emojis";
  }

  if (message.includes("Invalid category")) {
    return "Please select a valid category";
  }

  if (message.includes("Duration must be 2, 3, or 5 minutes")) {
    return "Please select a valid duration";
  }

  if (message.includes("Round does not exist")) {
    return "This round could not be found";
  }

  if (message.includes("Round has already been resolved")) {
    return "This round has already ended";
  }

  if (message.includes("Round deadline has passed")) {
    return "Time's up! The guessing period has ended";
  }

  if (message.includes("Round creator cannot guess")) {
    return "You can't guess in your own round";
  }

  if (message.includes("already submitted a guess")) {
    return "You've already submitted a guess for this round";
  }

  if (message.includes("Round deadline has not passed yet")) {
    return "The round is still active. Wait for the deadline to resolve.";
  }

  if (message.includes("At least 2 guesses are required")) {
    return "Need at least 2 guesses to resolve this round";
  }

  // Wallet errors
  if (message.includes("user rejected")) {
    return "Transaction was cancelled";
  }

  if (message.includes("insufficient funds")) {
    return "Insufficient funds for transaction";
  }

  // Network errors
  if (message.includes("network") || message.includes("connection")) {
    return "Network error. Please check your connection.";
  }

  // RPC errors (often indicate contract call failures like non-existent data)
  if (message.includes("RPC error") || message.includes("unknown RPC error")) {
    return "This round doesn't exist or hasn't been created yet";
  }

  // Default fallback
  return message.length > 100 ? "An error occurred. Please try again." : message;
}
