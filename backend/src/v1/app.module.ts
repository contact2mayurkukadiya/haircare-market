import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { DatabaseModule, ConfigsModule } from './configs';

import { AppService } from './app.service';
import { UsersModule } from './users';
import { AppController } from './app.controller';
import { AuthModule } from './auth';
import { ProductsModule } from './products/products.module';
import { LoggerMiddleware } from './middlewares';
import { AdminModule } from './admin/admin.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigsModule,
    DatabaseModule,
    EmailModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
