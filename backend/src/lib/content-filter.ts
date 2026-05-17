import { logger } from "./logger";

// Patterns that indicate bad/empty inputs
const GARBAGE_PATTERNS = [
  /^(.)\1{4,}$/,           // Repeated single character: "aaaaaaa"
  /^[\s\W]+$/,             // Only whitespace/symbols
  /^(test|hello|hi|hey|ok|yes|no|lol|haha)$/i,  // Meaningless test inputs
  /^\d+$/,                  // Only numbers
];

// Blocked content categories
const BLOCKED_PATTERNS = [
  /\b(hack|exploit|vulnerability|bypass|jailbreak|ignore.*instructions|forget.*rules)\b/i,
  /\b(adult content|xxx|pornograph|sexually explicit)\b/i,
  /\b(bomb|weapon|kill|murder|suicide)\b/i,
];

// Minimum quality checks
const MIN_IDEA_LENGTH = 5;
const MAX_IDEA_LENGTH = 500;

export interface FilterResult {
  allowed: boolean;
  reason?: string;
  cleanedInput?: string;
  suggestion?: string;
}

export function filterUserInput(input: string, fieldName: string = "idea"): FilterResult {
  if (!input || typeof input !== "string") {
    return { allowed: false, reason: `${fieldName} is required` };
  }
  
  const trimmed = input.trim();
  
  // Length checks
  if (trimmed.length < MIN_IDEA_LENGTH) {
    return { 
      allowed: false, 
      reason: "Too short",
      suggestion: "Please be more specific. For example: 'How to grow Instagram from 0 to 10K followers'"
    };
  }
  
  if (trimmed.length > MAX_IDEA_LENGTH) {
    return { 
      allowed: true, 
      cleanedInput: trimmed.substring(0, MAX_IDEA_LENGTH)  // Truncate, don't block
    };
  }
  
  // Garbage input check
  for (const pattern of GARBAGE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { 
        allowed: false, 
        reason: "Input doesn't seem like a content idea",
        suggestion: "Try something like: 'Why I started working out at 6am every day'"
      };
    }
  }
  
  // Blocked content check
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { 
        allowed: false, 
        reason: "This type of content cannot be generated",
      };
    }
  }
  
  // Clean the input
  const cleaned = trimmed
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/[<>{}\\]/g, '')       // Remove dangerous chars
    .trim();
  
  return { allowed: true, cleanedInput: cleaned };
}

// Enhance the input to get better AI output
export function enhancePrompt(idea: string, niche: string, contentType: string): string {
  const nicheContext = niche && niche !== "General" ? ` (${niche} creator)` : "";
  const typeContext = contentType ? ` for ${contentType} content` : "";
  
  // If idea is very short, add context
  if (idea.length < 20) {
    return `${idea}${nicheContext}${typeContext}`;
  }
  
  return idea;
}
