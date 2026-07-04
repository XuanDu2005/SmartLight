/**
 * Standard auth-domain exceptions. Each carries an HTTP status and an
 * application-level error code (consumed by the global exception filter).
 *
 * The error-code strings match docs/04-api-design/ERROR_RESPONSE_STANDARD.md.
 */
import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidCredentialsException extends HttpException {
  constructor(message = 'Invalid email or password') {
    super({ code: 'INVALID_CREDENTIALS', message }, HttpStatus.UNAUTHORIZED);
  }
}

export class AccountLockedException extends HttpException {
  constructor(message = 'Account temporarily locked. Try again later.') {
    // HTTP 423 Locked — not exposed as a named constant in @nestjs/common.
    super({ code: 'ACCOUNT_LOCKED', message }, 423);
  }
}

export class EmailNotVerifiedException extends HttpException {
  constructor(message = 'Email address has not been verified') {
    super(
      { code: 'EMAIL_NOT_VERIFIED', message, verificationRequired: true },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class AccountSuspendedException extends HttpException {
  constructor(message = 'Account has been suspended') {
    super({ code: 'ACCOUNT_SUSPENDED', message }, HttpStatus.FORBIDDEN);
  }
}

export class TokenExpiredException extends HttpException {
  constructor(message = 'Token has expired') {
    super({ code: 'TOKEN_EXPIRED', message }, HttpStatus.UNAUTHORIZED);
  }
}

export class TokenInvalidException extends HttpException {
  constructor(message = 'Token is invalid') {
    super({ code: 'TOKEN_INVALID', message }, HttpStatus.UNAUTHORIZED);
  }
}

export class TokenRevokedException extends HttpException {
  constructor(message = 'Refresh token has been revoked') {
    super({ code: 'REFRESH_TOKEN_REVOKED', message }, HttpStatus.UNAUTHORIZED);
  }
}

export class EmailAlreadyExistsException extends HttpException {
  constructor(message = 'Email is already in use') {
    super({ code: 'EMAIL_ALREADY_EXISTS', message }, HttpStatus.CONFLICT);
  }
}

export class WeakPasswordException extends HttpException {
  constructor(message = 'Password does not meet security requirements') {
    super({ code: 'WEAK_PASSWORD', message }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'You do not have permission to access this resource') {
    super({ code: 'FORBIDDEN', message }, HttpStatus.FORBIDDEN);
  }
}