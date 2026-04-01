import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutService } from '../../../core/services/checkout.service';
import { CartService } from '../../../core/services/cart.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-cod-payment-step',
  standalone: true,
  imports: [CommonModule, NzButtonModule],
  templateUrl: './cod-payment-step.component.html',
})
export class CodPaymentStepComponent {
  checkout = inject(CheckoutService);
  cart = inject(CartService);
  private message = inject(NzMessageService);

  placingOrder = false;

  goBack(): void {
    this.checkout.updateState({ step: 2 });
  }

  placeCodOrder(): void {
    const state = this.checkout.state$.value;
    const orderPayload = {
      items: this.cart.items().map(i => ({
        productId: i.product._id,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        image: i.product.images?.[0]
          ? i.product.images[0].split('/').pop()
          : undefined
      })),
      shippingAddress: state.shippingAddress,
      paymentMethod: 'cod'
    };

    this.placingOrder = true;
    this.checkout.createOrder(orderPayload).subscribe({
      next: (order) => {
        this.checkout.updateState({ orderId: order._id, step: 4 });
        this.cart.clear();
        this.message.success('COD order placed successfully');
        this.placingOrder = false;
      },
      error: (err) => {
        this.message.error(err?.error?.message || 'Failed to place COD order');
        this.placingOrder = false;
      }
    });
  }
}
