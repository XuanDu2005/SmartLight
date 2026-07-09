/**
 * Media HTTP exceptions.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import type { MediaErrorCode } from '../constants/media.constants';

export class MediaException extends HttpException {
  public readonly code: MediaErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: MediaErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, httpStatus);
    this.code = code;
    this.details = details;
  }
}

export class MediaFileNotFoundException extends MediaException {
  constructor(id: string) {
    super(
      'MEDIA_FILE_NOT_FOUND',
      `Media file not found: ${id}`,
      HttpStatus.NOT_FOUND,
      { id },
    );
  }
}

export class InvalidMimeTypeException extends MediaException {
  constructor(mimeType: string, allowed: string[]) {
    super(
      'MEDIA_INVALID_MIME_TYPE',
      `Unsupported mime type: ${mimeType}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { mimeType, allowed },
    );
  }
}

export class FileTooLargeException extends MediaException {
  constructor(sizeBytes: number, maxBytes: number) {
    super(
      'MEDIA_FILE_TOO_LARGE',
      `File too large: ${sizeBytes} bytes (max ${maxBytes})`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { sizeBytes, maxBytes },
    );
  }
}

export class MediaUploadFailedException extends MediaException {
  constructor(reason: string) {
    super(
      'MEDIA_UPLOAD_FAILED',
      `Upload failed: ${reason}`,
      HttpStatus.BAD_GATEWAY,
      { reason },
    );
  }
}

export class MediaDeleteFailedException extends MediaException {
  constructor(reason: string) {
    super(
      'MEDIA_DELETE_FAILED',
      `Delete failed: ${reason}`,
      HttpStatus.BAD_GATEWAY,
      { reason },
    );
  }
}

export class SignedUrlFailedException extends MediaException {
  constructor(reason: string) {
    super(
      'MEDIA_SIGNED_URL_FAILED',
      `Could not sign URL: ${reason}`,
      HttpStatus.BAD_GATEWAY,
      { reason },
    );
  }
}