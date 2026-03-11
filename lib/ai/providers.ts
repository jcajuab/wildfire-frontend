/**
 * Shared AI provider constants.
 *
 * This is the single source of truth for which providers the frontend supports.
 * The backend validates against a superset (adds "azure" and "mistral") — those
 * are intentionally excluded here because the chat adapter only handles the
 * three providers listed below.  When a new provider is wired into the Vercel AI
 * adapter, add it here so both the chat bubble and the credentials UI pick it up
 * automatically.
 */

export const AI_PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "google", label: "Google" },
] as const;

export type AIProviderId = (typeof AI_PROVIDERS)[number]["id"];
