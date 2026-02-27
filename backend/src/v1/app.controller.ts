import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './guards';
import { AppService } from './app.service';
import { IUser } from 'src/interfaces';

@Controller({ version: '1' })
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(@Res() res: Response): void {
    this.appService.getHello(res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('protected')
  async getProtectedHello(@Req() req: Request): Promise<IUser> {
    return req.user as IUser;
  }
}

