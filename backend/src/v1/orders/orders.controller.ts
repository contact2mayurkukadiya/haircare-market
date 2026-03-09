import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthGuard } from '@nestjs/passport';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { JwtUserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Orders')
@Controller({ version: '1', path: 'orders' })
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Create a new order (user)' })
    @UseGuards(AuthGuard('jwt'))
    @Post()
    create(
        @Request() req: { user: JwtUserPayload },
        @Body() dto: CreateOrderDto,
    ) {
        return this.ordersService.create(req.user.sub, dto);
    }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get my orders (user)' })
    @UseGuards(AuthGuard('jwt'))
    @Get('my')
    myOrders(@Request() req: { user: JwtUserPayload }) {
        return this.ordersService.findByUser(req.user.sub);
    }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get all orders (admin analytics)' })
    @UseGuards(AdminAuthGuard)
    @Get('admin/all')
    findAll() {
        return this.ordersService.findAll();
    }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get all transactions (admin analytics)' })
    @UseGuards(AdminAuthGuard)
    @Get('admin/transactions')
    findAllTransactions() {
        return this.ordersService.findAllTransactions();
    }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get revenue by category (admin analytics)' })
    @UseGuards(AdminAuthGuard)
    @Get('admin/analytics/category-revenue')
    getRevenueByCategory() {
        return this.ordersService.getRevenueByCategory();
    }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get monthly revenue (admin analytics)' })
    @UseGuards(AdminAuthGuard)
    @Get('admin/analytics/monthly-revenue')
    getMonthlyRevenue() {
        return this.ordersService.getMonthlyRevenue();
    }
}
