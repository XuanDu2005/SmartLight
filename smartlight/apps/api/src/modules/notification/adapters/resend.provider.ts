/**
 * Resend email provider.
 *
 * Uses the Resend HTTP API directly:
 *   POST https://api.resend.com/emails
 *   Authorization: Bearer {RESEND_API_KEY}
 *
 * No SDK dependency \u2014 keeps the dependency footprint small.
 */
import { Injectable, Logger } from '@nestjs/common';
import type {
  IEmailProvider,
  EmailMessage,
  ProviderSendResult,
} from '../interfaces/provider.interface';
import {
  NotificationProviderFailedException,
  ResendNotConfiguredException,
} from '../exceptions/notification.exceptions';

@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  readonly providerName = 'resend';
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly apiKey: string;
  private readonly fromDefault: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY ?? '';
    this.fromDefault = process.env.EMAIL_FROM ?? 'no-reply@smartlight.vn';
  }

  async send(message: EmailMessage): Promise<ProviderSendResult> {
    if (!this.apiKey) {
      throw new ResendNotConfiguredException();
    }

    const payload = {
      from: message.fromName
        ? `${message.fromName} <${message.from}>`
        : message.from,
      to: [message.to],
      subject: message.subject,
      text: message.body,
      reply_to: message.replyTo,
      tags: message.metadata,
    };

    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new NotificationProviderFailedException(
        this.providerName,
        `network: ${(err as Error).message ?? 'unknown'}`,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new NotificationProviderFailedException(
        this.providerName,
        `${response.status}: ${text.slice(0, 200)}`,
      );
    }

    const json = (await response.json()) as { id?: string };
    return {
      providerMessageId: json.id ?? 'unknown',
      accepted: true,
    };
  }
}
