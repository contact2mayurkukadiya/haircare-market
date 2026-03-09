import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Order, OrderSchema } from './entities/order.schema';
import { Transaction, TransactionSchema } from './entities/transaction.schema';
import { Categories, CategoriesSchema } from '../categories/entities/category.schema';
import { Products, ProductsSchema } from '../products/entities/products.schema';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Order.name, schema: OrderSchema },
            { name: Transaction.name, schema: TransactionSchema },
            { name: 'Categories', schema: CategoriesSchema },
            { name: 'Products', schema: ProductsSchema },
        ]),
        AdminModule,
    ],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }
