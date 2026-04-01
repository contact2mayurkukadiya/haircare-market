import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { Order, OrderDocument, OrderStatus } from './entities/order.schema';
import { Transaction, TransactionDocument, TransactionStatus } from './entities/transaction.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class OrdersService {
    constructor(
        @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
        @InjectModel(Transaction.name) private readonly txModel: Model<TransactionDocument>,
        @InjectModel('Categories') private readonly categoryModel: Model<any>,
        @InjectModel('Products') private readonly productModel: Model<any>,
        private readonly emailService: EmailService,
    ) { }

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /** Aggregates total revenue grouped by product category for 'paid' orders.
     * Scale-Optimized Hybrid Approach:
     * 1. DB-side: Sum revenue per Product ID (reduces millions of orders to a few thousand records).
     * 2. DB-side: Fetch Categories only for those products + all Category names (thousands of records).
     * 3. JS-side: Efficiently map and group totals (very fast and memory-light).
     */
    async getRevenueByCategory(): Promise<any[]> {
        // Step 1: Sum revenue by Product ID across all 'paid' orders (High reduction)
        const productRevenueList = await this.orderModel.aggregate([
            { $match: { status: 'paid' } },
            { $unwind: '$items' },
            { $match: { 'items.productId': { $ne: null } } }, // Filter out items with missing product IDs
            {
                $group: {
                    _id: '$items.productId',
                    revenue: {
                        $sum: { $multiply: ['$items.price', '$items.quantity'] },
                    },
                },
            },
        ]);

        if (productRevenueList.length === 0) {
            const allCats = await this.categoryModel.find({}, { name: 1 }).lean();
            return allCats.map(c => ({ category: c.name, revenue: 0 }));
        }

        // Step 2: Get Category info for the sold products
        const soldProductIds = productRevenueList
            .filter(p => p._id) // Extra safety check
            .map(p => new Types.ObjectId(p._id));

        const products = await this.productModel
            .find({ _id: { $in: soldProductIds } }, { category: 1 })
            .lean();

        // Step 3: Fetch all categories (to include those with 0 revenue)
        const allCategories = await this.categoryModel.find({}, { name: 1 }).lean();

        // Step 4: Map and Aggregate in JS
        const productToCategoryMap: Record<string, string> = {};
        products.forEach((p) => {
            if (p.category && p._id) {
                productToCategoryMap[p._id.toString()] = p.category.toString();
            }
        });

        const revenueMap: Record<string, { category: string; revenue: number }> = {};
        allCategories.forEach((cat) => {
            if (cat._id) {
                revenueMap[cat._id.toString()] = { category: cat.name, revenue: 0 };
            }
        });

        productRevenueList.forEach((p) => {
            if (p._id) {
                const catId = productToCategoryMap[p._id.toString()];
                if (catId && revenueMap[catId]) {
                    revenueMap[catId].revenue += p.revenue;
                }
            }
        });

        return Object.values(revenueMap).sort((a, b) => b.revenue - a.revenue);
    }

    /** Aggregates total revenue grouped by month for 'paid' orders in the current year. */
    async getMonthlyRevenue(): Promise<any[]> {
        const currentYear = new Date().getFullYear();
        return this.orderModel.aggregate([
            {
                $match: {
                    status: 'paid',
                    createdAt: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lte: new Date(`${currentYear}-12-31T23:59:59`),
                    },
                },
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    revenue: { $sum: '$total' },
                },
            },
            { $project: { _id: 0, month: '$_id', revenue: 1 } },
            { $sort: { month: 1 } },
        ]);
    }

    /** Create a new order with status 'pending'. Returns the saved order. */
    async create(userId: string, dto: CreateOrderDto): Promise<OrderDocument> {
        const subtotal = dto.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const order = new this.orderModel({
            userId: new Types.ObjectId(userId),
            items: dto.items,
            shippingAddress: dto.shippingAddress,
            subtotal,
            total: subtotal, // Shipping free for now
            status: 'pending',
            paymentMethod: dto.paymentMethod,
            notes: dto.notes,
        });
        return order.save();
    }

    /** Update order status unconditionally. Called by Stripe webhook handler. */
    async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
        const result = await this.orderModel.updateOne({ _id: orderId }, { $set: { status } });
        if (result.matchedCount === 0) throw new NotFoundException(`Order ${orderId} not found`);
    }

    /**
     * Atomically transition an order from 'pending' to the given status.
     * The filter includes `status: 'pending'` so the update is a no-op if another
     * concurrent request has already changed the status (e.g. a successful capture).
     * Returns true if the update was applied, false if the order was already in a
     * terminal state.
     */
    async updateStatusIfPending(orderId: string, status: OrderStatus): Promise<boolean> {
        const result = await this.orderModel.updateOne(
            { _id: orderId, status: 'pending' },
            { $set: { status } },
        );
        return result.modifiedCount > 0;
    }

    /** Record a transaction log entry. */
    async recordTransaction(data: {
        orderId: string;
        userId: string;
        gateway: string;
        gatewayTxId: string;
        status: TransactionStatus;
        amount: number;
        currency: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const tx = new this.txModel({
            orderId: new Types.ObjectId(data.orderId),
            userId: new Types.ObjectId(data.userId),
            gateway: data.gateway,
            gatewayTxId: data.gatewayTxId,
            status: data.status,
            amount: data.amount,
            currency: data.currency,
            metadata: data.metadata,
        });
        await tx.save();
    }

    private mapOrderImages(order: any): any {
        if (order?.items?.length) {
            order.items = order.items.map((item: any) => {
                if (item.image && !item.image.startsWith('http') && !item.image.startsWith('/static')) {
                    item.image = `${process.env.SERVER_URL}/static/thumbnails/${item.image}`;
                }
                return item;
            });
        }
        return order;
    }

    /** Get all orders for a specific user. */
    async findByUser(userId: string): Promise<any[]> {
        const orders = await this.orderModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).lean().exec();
        return orders.map(o => this.mapOrderImages(o));
    }

    /** Get all orders — for admin analytics. */
    async findAll(): Promise<any[]> {
        const orders = await this.orderModel.find().sort({ createdAt: -1 }).populate('userId', 'name email').lean().exec();
        return orders.map(o => this.mapOrderImages(o));
    }

    /** Get all transactions — for admin analytics. */
    async findAllTransactions(): Promise<TransactionDocument[]> {
        return this.txModel.find().sort({ createdAt: -1 }).exec();
    }

    async sendCodOtp(orderId: string): Promise<{ message: string }> {
        const order = await this.orderModel.findById(orderId).populate('userId', 'name email').lean().exec();
        if (!order) throw new NotFoundException(`Order ${orderId} not found`);
        if (order.paymentMethod !== 'cod') throw new BadRequestException('OTP is supported only for COD orders');
        if (order.status !== 'pending') throw new BadRequestException(`Cannot send OTP for ${order.status} order`);

        const user = order.userId as { name?: string; email?: string } | undefined;
        if (!user?.email) throw new BadRequestException('Customer email not found for this order');

        const otp = this.generateOtp();
        const codOtpHash = await bcrypt.hash(otp, 10);
        const codOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const codOtpSentAt = new Date();

        await this.orderModel.updateOne(
            { _id: orderId },
            {
                $set: { codOtpHash, codOtpExpiresAt, codOtpSentAt },
                $unset: { codOtpVerifiedAt: '' },
            },
        );

        await this.emailService.sendCodOrderOtpEmail(user.email, user.name || 'Customer', otp, orderId);
        return { message: 'COD OTP sent to customer email' };
    }

    async verifyCodOtp(orderId: string, otp: string): Promise<{ message: string }> {
        const order = await this.orderModel.findById(orderId).lean().exec();
        if (!order) throw new NotFoundException(`Order ${orderId} not found`);
        if (order.paymentMethod !== 'cod') throw new BadRequestException('OTP verification is supported only for COD orders');
        if (order.status !== 'pending') throw new BadRequestException(`Order is already ${order.status}`);
        if (!order.codOtpHash || !order.codOtpExpiresAt) {
            throw new BadRequestException('OTP has not been sent for this order');
        }
        if (new Date() > new Date(order.codOtpExpiresAt)) {
            throw new BadRequestException('OTP has expired. Please send OTP again');
        }

        const isOtpValid = await bcrypt.compare(otp, order.codOtpHash);
        if (!isOtpValid) throw new BadRequestException('Invalid OTP');

        await this.orderModel.updateOne(
            { _id: orderId },
            {
                $set: { status: 'paid', codOtpVerifiedAt: new Date() },
                $unset: { codOtpHash: '', codOtpExpiresAt: '' },
            },
        );

        await this.recordTransaction({
            orderId,
            userId: (order.userId as Types.ObjectId).toString(),
            gateway: 'cod',
            gatewayTxId: `cod_${orderId}_${Date.now()}`,
            status: 'succeeded',
            amount: Math.round(order.total * 100),
            currency: 'usd',
            metadata: { source: 'admin-cod-otp-verify' },
        });

        return { message: 'COD payment verified and order marked successful' };
    }
}
