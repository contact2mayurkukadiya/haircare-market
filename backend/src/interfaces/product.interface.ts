import { ICategory } from './category.interface';

export interface IProduct {
  _id?: string;
  name: string;
  desc: string;
  price: number;
  category: string | ICategory;
  tags?: string[];
  images?: string[];
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
}
