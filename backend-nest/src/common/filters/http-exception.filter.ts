import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!isHttp) {
      this.logger.error(
        `Unhandled exception on [${req.method}] ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body = isHttp ? exception.getResponse() : { message: 'Internal server error' };

    res.status(status).json({
      ...(typeof body === 'string' ? { message: body } : (body as object)),
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
