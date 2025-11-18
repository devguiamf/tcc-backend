import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class FormDataParseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.body && typeof request.body === 'object') {
      this.parseJsonFields(request.body);
    }
    return next.handle();
  }

  private parseJsonFields(body: any): void {
    for (const key in body) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        const value = body[key];
        if (typeof value === 'string' && this.isJsonString(value)) {
          try {
            body[key] = JSON.parse(value);
          } catch {
            // Se não for JSON válido, mantém o valor original
          }
        } else if (typeof value === 'object' && value !== null) {
          this.parseJsonFields(value);
        }
      }
    }
  }

  private isJsonString(str: string): boolean {
    try {
      JSON.parse(str);
      return str.trim().startsWith('{') || str.trim().startsWith('[');
    } catch {
      return false;
    }
  }
}

