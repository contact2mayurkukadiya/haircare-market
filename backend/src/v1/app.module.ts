import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { DatabaseModule, ConfigsModule } from './configs';

import { AppService } from './app.service';
import { UsersModule } from './users';
import { AppController } from './app.controller';
import { AuthModule } from './auth';
import { ProductsModule } from './products/products.module';
import { LoggerMiddleware } from './middlewares';
import { AdminModule } from './admin/admin.module';
import { EmailModule } from './email/email.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    ConfigsModule,
    DatabaseModule,
    EmailModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    AdminModule,
    CategoriesModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/static',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
