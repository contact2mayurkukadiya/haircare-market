export interface IProduct {
  _id?: string;
  name: string;
  desc: string;
  price: number;
  category: string;
  tags?: string[];
  images?: string[];
}
