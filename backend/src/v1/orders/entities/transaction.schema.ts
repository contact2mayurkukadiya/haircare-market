import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document<string>;

export type TransactionStatus = 'pending' | 'succeeded' | 'failed';

@Schema({ timestamps: true })
export class Transaction {
    @Prop({ type: Types.ObjectId, ref: 'orders', required: true })
    orderId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'users', required: true })
    userId!: Types.ObjectId;

    @Prop({ enum: ['stripe', 'paypal', 'upi'], required: true })
    gateway!: string;

    /** e.g. Stripe PaymentIntent ID: pi_xxx */
    @Prop({ required: true })
    gatewayTxId!: string;

    @Prop({ enum: ['pending', 'succeeded', 'failed'], default: 'pending' })
    status!: TransactionStatus;

    /** Amount in smallest currency unit (e.g. cents) */
    @Prop({ required: true })
    amount!: number;

    @Prop({ default: 'usd' })
    currency!: string;

    /** Raw gateway response snapshot for debugging/analytics */
    @Prop({ type: Object })
    metadata?: Record<string, unknown>;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
