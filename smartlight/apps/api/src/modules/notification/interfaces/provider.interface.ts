/**
 * Email/SMS/Push provider contract.
 *
 * Each adapter is stateless and exposes a single `send` method that returns
 * the provider message id. The provider name is exposed for logging.
 */
export interface EmailMessage {
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  body: string;
  /** Optional reply-to address. */
  replyTo?: string;
  /** Optional tagged metadata stored at the provider. */
  metadata?: Record<string, string>;
}

export interface ProviderSendResult {
  providerMessageId: string;
  accepted: boolean;
}

export interface IEmailProvider {
  readonly providerName: string;
  send(message: EmailMessage): Promise<ProviderSendResult>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');