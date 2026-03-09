import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentGatewayConfigDocument = PaymentGatewayConfig & Document<string>;

export type GatewayName = 'stripe' | 'paypal' | 'upi';

@Schema({ timestamps: true })
export class PaymentGatewayConfig {
    @Prop({ required: true, unique: true, enum: ['stripe', 'paypal', 'upi'] })
    gateway!: GatewayName;

    @Prop({ default: false })
    enabled!: boolean;

    /**
     * Credential values are AES-256 encrypted strings.
     * Keys are descriptive names (e.g. 'secretKey', 'publishableKey').
     * Never returned to frontend — only admin service reads them for payment processing.
     */
    @Prop({ type: Object, default: {} })
    credentials!: Record<string, string>;
}

export const PaymentGatewayConfigSchema = SchemaFactory.createForClass(PaymentGatewayConfig);
