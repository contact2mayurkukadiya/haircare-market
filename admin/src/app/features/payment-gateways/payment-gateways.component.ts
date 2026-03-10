import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSelectModule } from 'ng-zorro-antd/select';

interface GatewayConfig {
  gateway: 'stripe' | 'paypal' | 'upi';
  enabled: boolean;
  credentials: Record<string, string>;
}

@Component({
  selector: 'app-payment-gateways',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzSwitchModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzBadgeModule,
    NzSpinModule,
    NzSelectModule
  ],
  templateUrl: './payment-gateways.component.html',
  styleUrl: './payment-gateways.component.scss'
})
export class PaymentGatewaysComponent implements OnInit {
  private api = inject(ApiService);
  private message = inject(NzMessageService);
  private apiUrlPrefix = '/admin/payment-gateways';

  gateways: GatewayConfig[] = [];
  loading = true;
  saving: Record<string, boolean> = {};

  // Local state for forms
  stripeCreds = { publishableKey: '', secretKey: '', webhookSecret: '' };
  showStripePublishableKey = false;
  showStripeSecret = false;
  showStripeWebhookSecret = false;

  paypalCreds = { clientId: '', clientSecret: '', mode: 'sandbox' };
  showPaypalClientId = false;
  showPaypalClientSecret = false;

  ngOnInit() {
    this.loadConfigs();
  }

  loadConfigs() {
    this.loading = true;
    this.api.get<GatewayConfig[]>(this.apiUrlPrefix).subscribe({
      next: (data) => {
        this.gateways = data;

        // Initialize state if missing in DB
        const requiredGateways: ('stripe' | 'paypal' | 'upi')[] = ['stripe', 'paypal', 'upi'];
        requiredGateways.forEach(gw => {
          if (!this.gateways.find(g => g.gateway === gw)) {
            this.gateways.push({ gateway: gw, enabled: false, credentials: {} });
          }
        });

        const stripeConfig = this.gateways.find(g => g.gateway === 'stripe');
        if (stripeConfig?.credentials) {
          this.stripeCreds.publishableKey = stripeConfig.credentials['publishableKey'] || '';
          this.stripeCreds.secretKey = stripeConfig.credentials['secretKey'] || '';
          this.stripeCreds.webhookSecret = stripeConfig.credentials['webhookSecret'] || '';
        }

        const paypalConfig = this.gateways.find(g => g.gateway === 'paypal');
        if (paypalConfig?.credentials) {
          this.paypalCreds.clientId = paypalConfig.credentials['clientId'] || '';
          this.paypalCreds.clientSecret = paypalConfig.credentials['clientSecret'] || '';
          this.paypalCreds.mode = paypalConfig.credentials['mode'] || 'sandbox';
        }

        this.loading = false;
      },
      error: () => {
        this.message.error('Failed to load gateway configs');
        this.loading = false;
      }
    });
  }

  toggleGateway(gateway: GatewayConfig) {
    this.saveConfig(gateway.gateway, { enabled: gateway.enabled }); // Just toggle state, don't override creds yet unless submitted
  }

  saveStripeCreds() {
    const gateway = this.gateways.find(g => g.gateway === 'stripe');
    if (!gateway) return;

    const credUpdate: Record<string, string> = {
      publishableKey: this.stripeCreds.publishableKey,
      secretKey: this.stripeCreds.secretKey,
      webhookSecret: this.stripeCreds.webhookSecret
    };

    this.saveConfig('stripe', { enabled: gateway.enabled, credentials: credUpdate });
  }

  savePaypalCreds() {
    const gateway = this.gateways.find(g => g.gateway === 'paypal');
    if (!gateway) return;

    const credUpdate: Record<string, string> = {
      clientId: this.paypalCreds.clientId,
      clientSecret: this.paypalCreds.clientSecret,
      mode: this.paypalCreds.mode,
    };

    this.saveConfig('paypal', { enabled: gateway.enabled, credentials: credUpdate });
  }

  private saveConfig(gatewayId: string, payload: any) {
    this.saving[gatewayId] = true;
    this.api.put<GatewayConfig>(`${this.apiUrlPrefix}/${gatewayId}`, payload).subscribe({
      next: (updatedConfig) => {
        this.message.success(`${gatewayId.toUpperCase()} config updated!`);
        this.saving[gatewayId] = false;

        // Update local object
        const index = this.gateways.findIndex(g => g.gateway === gatewayId);
        if (index > -1) {
          this.gateways[index] = updatedConfig;
        }

        if (gatewayId === 'stripe') {
          this.stripeCreds.publishableKey = updatedConfig.credentials['publishableKey'] || '';
          this.stripeCreds.secretKey = updatedConfig.credentials['secretKey'] || '';
          this.stripeCreds.webhookSecret = updatedConfig.credentials['webhookSecret'] || '';
        }

        if (gatewayId === 'paypal') {
          this.paypalCreds.clientId = updatedConfig.credentials['clientId'] || '';
          this.paypalCreds.clientSecret = updatedConfig.credentials['clientSecret'] || '';
          this.paypalCreds.mode = updatedConfig.credentials['mode'] || 'sandbox';
        }
      },
      error: () => {
        this.message.error('Failed to update config');
        this.saving[gatewayId] = false;
        this.loadConfigs(); // Revert toggle state if it failed
      }
    });
  }

  getGatewayConfig(gatewayId: string): GatewayConfig {
    return this.gateways.find(g => g.gateway === gatewayId) || { gateway: gatewayId as any, enabled: false, credentials: {} };
  }
}
