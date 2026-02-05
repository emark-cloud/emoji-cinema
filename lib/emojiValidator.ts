// Validate emoji input

// Regex to match emoji characters (ES5 compatible)
// This covers common emoji ranges
const emojiRegex =
  /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;

// Extract emojis from a string
export function extractEmojis(text: string): string[] {
  const matches = text.match(emojiRegex);
  return matches || [];
}

// Count emojis in a string
export function countEmojis(text: string): number {
  return extractEmojis(text).length;
}

// Check if a string contains only emojis (and optional whitespace)
export function isEmojiOnly(text: string): boolean {
  // Remove all emojis and whitespace, check if anything remains
  const withoutEmojis = text.replace(emojiRegex, "").replace(/\s/g, "");
  return withoutEmojis.length === 0 && countEmojis(text) > 0;
}

// Validate emoji description (3-8 emojis only)
export interface EmojiValidationResult {
  valid: boolean;
  count: number;
  error?: string;
}

export function validateEmojiDescription(text: string): EmojiValidationResult {
  const emojis = extractEmojis(text);
  const count = emojis.length;

  // Check for non-emoji characters
  const textWithoutEmojis = text.replace(emojiRegex, "").trim();
  if (textWithoutEmojis.length > 0) {
    return {
      valid: false,
      count,
      error: "Only emojis are allowed (no text or symbols)",
    };
  }

  if (count < 3) {
    return {
      valid: false,
      count,
      error: `Need at least 3 emojis (you have ${count})`,
    };
  }

  if (count > 8) {
    return {
      valid: false,
      count,
      error: `Maximum 8 emojis allowed (you have ${count})`,
    };
  }

  return { valid: true, count };
}

// Get emoji string cleaned of non-emoji characters
export function cleanEmojiString(text: string): string {
  return extractEmojis(text).join("");
}
