/**
 * PaymentsController \u2014 customer + admin + webhook endpoints.
 *
 * Customer routes are JwtAuthGuard-protected (global APP_GUARD).
 * Admin routes additionally require @Roles('admin', 'finance_manager').
 * Webhook routes are public but signature-protected.
 *
 * Security model:
 *   - signature verification on every webhook (no client-trust)
 *   - amount verification (server compares to order amount)
 *   - provider verification (provider must match Payment row)
 *   - eventId idempotency (replays return previous result)
 *   - ownership check on customer endpoints
 */
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';

import { PaymentsService } from './service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { UserPrincipal } from '../users/interfaces/user-principal.interface';
import type { AuthenticatedRequest } from '../users/interfaces/user-principal.interface';

import type {
  AdminListPaymentsQueryDto,
  CreatePaymentDto,
  ListPaymentsQueryDto,
  RetryPaymentDto,
} from './dto/create-payment.dto';
import type {
  AdminPaymentListResponseDto,
  PaymentDetailDto,
  PaymentIntentResponseDto,
  PaymentSummaryDto,
} from './dto/payment-response.dto';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /* ============================================================== */
  /*  Customer API                                                  */
  /* ============================================================== */

  /**
   * POST /payments
   * Create payment intent for an order.
   */
  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentIntentResponseDto> {
    return this.paymentsService.createPayment(user.id, dto);
  }

  /**
   * GET /payments/:id
   */
  @Get('payments/:id')
  async getOne(
    @CurrentUser() user: UserPrincipal,
    @Param('id') paymentId: string,
  ): Promise<PaymentDetailDto> {
    return this.paymentsService.getPaymentForUser(paymentId, user.id);
  }

  /**
   * POST /payments/:id/retry
   */
  @Post('payments/:id/retry')
  @HttpCode(HttpStatus.OK)
  async retry(
    @CurrentUser() user: UserPrincipal,
    @Param('id') paymentId: string,
    @Body() dto: RetryPaymentDto,
  ): Promise<PaymentIntentResponseDto> {
    return this.paymentsService.retryPayment(paymentId, user.id, dto);
  }

  /**
   * GET /payments
   */
  @Get('payments')
  async list(
    @CurrentUser() user: UserPrincipal,
    @Query() query: ListPaymentsQueryDto,
  ): Promise<{ items: PaymentSummaryDto[]; total: number; page: number; limit: number }> {
    return this.paymentsService.listPaymentsForUser(user.id, query);
  }

  /* ============================================================== */
  /*  Admin API                                                     */
  /* ============================================================== */

  @Get('admin/payments')
  @Roles('admin', 'finance_manager')
  async listAdmin(
    @Query() query: AdminListPaymentsQueryDto,
  ): Promise<AdminPaymentListResponseDto> {
    return this.paymentsService.listPaymentsForAdmin(query);
  }

  @Get('admin/payments/:id')
  @Roles('admin', 'finance_manager')
  async getAdmin(
    @Param('id') paymentId: string,
  ): Promise<PaymentDetailDto> {
    return this.paymentsService.getPaymentForAdmin(paymentId);
  }

  /* ============================================================== */
  /*  Webhooks (public, signature-verified)                         */
  /* ============================================================== */

  @Post('payments/webhook/momo')
  @HttpCode(HttpStatus.OK)
  async webhookMomo(
    @Body() payload: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: true; processed: boolean }> {
    const result = await this.paymentsService.handleWebhook(
      PaymentProvider.MOMO,
      payload,
      headers,
      this.headerString(headers['signature']),
    );
    return { received: true, processed: result.processed };
  }

  @Post('payments/webhook/vnpay')
  @HttpCode(HttpStatus.OK)
  async webhookVNPay(
    @Body() payload: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: true; processed: boolean }> {
    const result = await this.paymentsService.handleWebhook(
      PaymentProvider.VNPAY,
      payload,
      headers,
      this.headerString(headers['vnp_SecureHash']),
    );
    return { received: true, processed: result.processed };
  }

  @Post('payments/webhook/paypal')
  @HttpCode(HttpStatus.OK)
  async webhookPayPal(
    @Body() payload: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ received: true; processed: boolean }> {
    // PayPal transmits signature in multiple headers; service uses them all
    // during verifyCallback.
    const result = await this.paymentsService.handleWebhook(
      PaymentProvider.PAYPAL,
      payload,
      headers,
      this.headerString(headers['paypal-transmission-sig']),
    );
    return { received: true, processed: result.processed };
  }

  private headerString(h: string | string[] | undefined): string | null {
    if (!h) return null;
    if (Array.isArray(h)) return h[0] ?? null;
    return h;
  }
}