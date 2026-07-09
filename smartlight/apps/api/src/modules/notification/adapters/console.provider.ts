/**
 * Console email provider.
 *
 * Used as a fallback when RESEND_API_KEY is not configured \u2014 logs the
 * rendered email to the application logger so dev flows still work end-to-end.
 */
import { Injectable, Logger } from '@nestjs/common';
import type {
  IEmailProvider,
  EmailMessage,
  ProviderSendResult,
} from '../interfaces/provider.interface';

@Injectable()
export class ConsoleEmailProvider implements IEmailProvider {
  readonly providerName = 'console';
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async send(message: EmailMessage): Promise<ProviderSendResult> {
    const localId = `local-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    this.logger.log(
      `[email] to=${message.to} subject="${message.subject}" id=${localId}\n${message.body}`,
    );
    return { providerMessageId: localId, accepted: true };
  }
}