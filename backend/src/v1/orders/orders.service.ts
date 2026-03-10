import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Order, OrderDocument, OrderStatus } from './entities/order.schema';
import { Transaction, TransactionDocument, TransactionStatus } from './entities/transaction.schema';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
    constructor(
        @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
        @InjectModel(Transaction.name) private readonly txModel: Model<TransactionDocument>,
        @InjectModel('Categories') private readonly categoryModel: Model<any>,
        @InjectModel('Products') private readonly productModel: Model<any>,
    ) { }

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

    /** Update order status. Called by webhook handler after payment confirmation. */
    async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
        const result = await this.orderModel.updateOne({ _id: orderId }, { $set: { status } });
        if (result.matchedCount === 0) throw new NotFoundException(`Order ${orderId} not found`);
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
}
