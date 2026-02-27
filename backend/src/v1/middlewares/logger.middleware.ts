import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;

    // Capture the timestamp in UTC format immediately
    const timestamp = new Date().toISOString();

    res.on('finish', () => {
      const { statusCode } = res;

      // Read body & params at finish time (deferred parsers may not have run yet at middleware entry)
      // Guard against undefined/null for requests with no body (GET, DELETE, etc.)
      const params = req.params;
      const body = req.body;

      const paramsStr =
        params && typeof params === 'object' && Object.keys(params).length
          ? JSON.stringify(params)
          : 'none';

      const bodyStr =
        body && typeof body === 'object' && Object.keys(body).length
          ? JSON.stringify(body)
          : 'none';

      // Format: <timestamp UTC> [Method] <Api Route> : <Status Code> : <params> : <body>
      this.logger.log(
        `[${method}] ${originalUrl} : ${statusCode} : ${paramsStr} : ${bodyStr}`,
      );
    });

    next();
  }
}