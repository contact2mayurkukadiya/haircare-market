import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IProduct } from 'src/interfaces';

export type ProductsDocument = Products & Document<string>;

@Schema({ timestamps: true })
export class Products implements Omit<IProduct, 'category'> {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  desc!: string;

  @Prop({ required: true })
  price!: number;

  @Prop({ type: Types.ObjectId, ref: 'categories', required: true })
  category!: Types.ObjectId;

  @Prop({ type: [String] })
  tags?: string[];

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ required: true, default: 0 })
  stock!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isFeatured!: boolean;
}

export const ProductsSchema = SchemaFactory.createForClass(Products);
