import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document<string>;

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export type PaymentMethodType = 'stripe' | 'paypal' | 'upi' | 'cod';

@Schema({ _id: false }) // Optionally remove _id if you don't want Mongo generating one for each item
class OrderItem {
    @Prop({ required: true }) productId!: string;
    @Prop({ required: true }) name!: string;
    @Prop({ required: true }) price!: number;
    @Prop({ required: true }) quantity!: number;
    @Prop() image?: string;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false }) // Prevent it from storing just an empty _id
class ShippingAddress {
    @Prop() street?: string;
    @Prop() city?: string;
    @Prop() state?: string;
    @Prop() zip?: string;
    @Prop() country?: string;
}

const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

@Schema({ timestamps: true })
export class Order {
    @Prop({ type: Types.ObjectId, ref: 'users', required: true })
    userId!: Types.ObjectId;

    @Prop({ type: [OrderItemSchema], required: true })
    items!: OrderItem[];

    @Prop({ type: ShippingAddressSchema, required: true })
    shippingAddress!: ShippingAddress;

    @Prop({ required: true })
    subtotal!: number;

    @Prop({ required: true })
    total!: number;

    @Prop({ enum: ['pending', 'paid', 'failed', 'cancelled'], default: 'pending' })
    status!: OrderStatus;

    @Prop({ enum: ['stripe', 'paypal', 'upi', 'cod'], required: true })
    paymentMethod!: PaymentMethodType;

    @Prop()
    notes?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
