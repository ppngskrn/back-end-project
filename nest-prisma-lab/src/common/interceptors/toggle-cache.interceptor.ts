import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class ToggleCacheInterceptor extends CacheInterceptor {
  protected isRequestCacheable(context: ExecutionContext): boolean {
    if (process.env.DISABLE_CACHE === 'true') {
      return false;
    }
    return super.isRequestCacheable(context);
  }
}