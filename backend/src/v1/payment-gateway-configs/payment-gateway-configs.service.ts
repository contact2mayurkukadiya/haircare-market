import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

import { PaymentGatewayConfig, PaymentGatewayConfigDocument, GatewayName } from './entities/payment-gateway-config.schema';
import { UpsertGatewayConfigDto } from './dto/upsert-gateway-config.dto';

@Injectable()
export class PaymentGatewayConfigsService {
    private readonly algorithm = 'aes-256-cbc';
    private readonly encKey: Buffer;

    constructor(
        @InjectModel(PaymentGatewayConfig.name)
        private readonly configModel: Model<PaymentGatewayConfigDocument>,
        private readonly configService: ConfigService,
    ) {
        // ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)
        const rawKey = this.configService.get<string>('ENCRYPTION_KEY') || 'haircare_payment_encryption_key_';
        this.encKey = Buffer.from(rawKey.padEnd(32).slice(0, 32));
    }

    // ─── Encryption helpers ───────────────────────────────────────────────────

    encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.encKey, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    }

    decrypt(ciphertext: string): string {
        const [ivHex, encHex] = ciphertext.split(':');
        if (!ivHex || !encHex) return ciphertext; // already plain (legacy fallback)
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.encKey, iv);
        const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
        return decrypted.toString('utf8');
    }

    /** Return masked value for UI display: first 8 chars visible, rest replaced with • */
    private mask(value: string): string {
        const visible = value.slice(0, 8);
        return visible + '•'.repeat(Math.max(0, value.length - 8));
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /** Find all gateway configs. Returns masked credentials (safe to send to admin frontend). */
    async findAll(): Promise<Array<{ gateway: string; enabled: boolean; credentials: Record<string, string> }>> {
        const docs = await this.configModel.find().lean().exec();
        return docs.map((d) => ({
            gateway: d.gateway,
            enabled: d.enabled,
            credentials: this.decryptCredentials(d.credentials || {}),
        }));
    }

    /** Find enabled gateways — returns gateway name + enabled flag ONLY. Called by user-facing API. */
    async findEnabled(): Promise<Array<{ gateway: string; enabled: boolean; publicKey?: string }>> {
        const docs = await this.configModel.find({ enabled: true }).lean().exec();
        return docs.map((d) => {
            let publicKey: string | undefined;
            if (d.gateway === 'stripe' && d.credentials && d.credentials['publishableKey']) {
                try {
                    publicKey = this.decrypt(d.credentials['publishableKey']);
                } catch {
                    publicKey = undefined;
                }
            }
            return { gateway: d.gateway, enabled: d.enabled, publicKey };
        });
    }

    /** Find one gateway config with decrypted credentials. For internal payment service use only. */
    async findOneDecrypted(gateway: GatewayName): Promise<{ enabled: boolean; credentials: Record<string, string> }> {
        const doc = await this.configModel.findOne({ gateway }).lean().exec();
        if (!doc) throw new NotFoundException(`Payment gateway "${gateway}" not configured`);
        const decrypted: Record<string, string> = {};
        for (const [k, v] of Object.entries(doc.credentials || {})) {
            decrypted[k] = this.decrypt(v);
        }
        return { enabled: doc.enabled, credentials: decrypted };
    }

    /** Upsert a gateway config. Plaintext credentials are AES-256 encrypted before storage. */
    async upsert(
        gateway: GatewayName,
        dto: UpsertGatewayConfigDto,
    ): Promise<{ gateway: string; enabled: boolean; credentials: Record<string, string> }> {
        // Encrypt any provided credentials
        const encryptedCreds: Record<string, string> = {};
        for (const [k, v] of Object.entries(dto.credentials || {})) {
            encryptedCreds[k] = this.encrypt(v);
        }

        const doc = await this.configModel.findOneAndUpdate(
            { gateway },
            {
                $set: {
                    enabled: dto.enabled,
                    ...(Object.keys(encryptedCreds).length > 0 && { credentials: encryptedCreds }),
                },
            },
            { upsert: true, new: true },
        ).lean().exec();

        return {
            gateway: doc!.gateway,
            enabled: doc!.enabled,
            credentials: this.decryptCredentials(doc!.credentials || {}),
        };
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private maskCredentials(creds: Record<string, string>): Record<string, string> {
        const masked: Record<string, string> = {};
        for (const [k, v] of Object.entries(creds)) {
            try {
                // Decrypt to get plaintext, then mask
                masked[k] = this.mask(this.decrypt(v));
            } catch {
                masked[k] = '•'.repeat(16);
            }
        }
        return masked;
    }

    private decryptCredentials(creds: Record<string, string>): Record<string, string> {
        const decrypted: Record<string, string> = {};
        for (const [k, v] of Object.entries(creds)) {
            try {
                decrypted[k] = this.decrypt(v);
            } catch {
                decrypted[k] = v;
            }
        }
        return decrypted;
    }
}
