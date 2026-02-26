import { Module } from '@nestjs/common';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersModel } from './entities';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [UsersModel, EmailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersModel, UsersService],
})
export class UsersModule { }
