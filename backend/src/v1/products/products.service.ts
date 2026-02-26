// prettier-ignore
import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';

import { ProductsDocument } from './entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { IProduct } from 'src/interfaces';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel('products')
    private readonly productsModel: Model<ProductsDocument>,
  ) { }

  async findAll(): Promise<ProductsDocument[]> {
    return this.productsModel.find({});
  }

  async findOne(productId: string): Promise<ProductsDocument> {
    const product = await this.productsModel.findById(productId);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<ProductsDocument> {
    const newProduct = new this.productsModel({ ...createProductDto });
    const createdProduct = await newProduct.save();
    if (!createdProduct) {
      throw new InternalServerErrorException('Unable to create product, please try again');
    }
    return createdProduct;
  }

  async update(
    productId: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductsDocument> {
    const product = await this.findOne(productId);

    const data: IProduct = {
      name: product.name,
      desc: product.desc,
      category: product.category,
      price: product.price,
      tags: product.tags,
    };

    if (updateProductDto.new_name) data.name = updateProductDto.new_name;
    if (updateProductDto.new_desc) data.desc = updateProductDto.new_desc;
    if (updateProductDto.new_price) data.price = updateProductDto.new_price;
    if (updateProductDto.new_category) data.category = updateProductDto.new_category;
    if (updateProductDto.new_tags) {
      data.tags = data.tags
        ? [...data.tags, ...updateProductDto.new_tags]
        : updateProductDto.new_tags;
    }

    const updatedProduct = await this.productsModel.findByIdAndUpdate(
      productId,
      { ...data },
      { new: true },
    );
    if (!updatedProduct) throw new BadRequestException('Unable to update product');
    return updatedProduct;
  }

  async remove(productId: string): Promise<string> {
    await this.productsModel.findByIdAndDelete(productId).catch((err) => {
      throw new BadRequestException(err);
    });
    return 'Product deleted';
  }
}
