// prettier-ignore
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
import { unlink } from 'fs/promises';
import { join } from 'path';

import { ProductsDocument } from './entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { IProduct } from 'src/interfaces';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'products');

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel('products')
    private readonly productsModel: Model<ProductsDocument>,
  ) { }

  private mapProduct(product: any): any {
    if (product?.images && product.images.length > 0) {
      product.images = product.images.map(
        (img: string) => img.startsWith('http') || img.startsWith('/static') ? img : `http://localhost:3000/static/products/${img}`
      );
    }
    return product;
  }

  async findAll(page = 1, limit = 12): Promise<PaginatedResult<IProduct>> {
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.productsModel.find({}).populate('category').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.productsModel.countDocuments({}),
    ]);
    return {
      data: products.map(p => this.mapProduct(p)) as unknown as IProduct[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(productId: string): Promise<IProduct> {
    const product = await this.productsModel.findById(productId).populate('category').lean();
    if (!product) throw new NotFoundException('Product not found');
    return this.mapProduct(product) as unknown as IProduct;
  }

  async create(createProductDto: CreateProductDto): Promise<IProduct> {
    const newProduct = new this.productsModel({ ...createProductDto });
    const createdProduct = await newProduct.save();
    if (!createdProduct) {
      throw new InternalServerErrorException('Unable to create product, please try again');
    }
    const populatedProduct = await this.productsModel.findById(createdProduct._id).populate('category').lean();
    return this.mapProduct(populatedProduct) as unknown as IProduct;
  }

  async update(
    productId: string,
    updateProductDto: UpdateProductDto,
  ): Promise<IProduct> {
    // Fetch raw product (filenames only, before mapProduct adds full URLs)
    const rawProduct = await this.productsModel.findById(productId).lean();
    if (!rawProduct) throw new NotFoundException('Product not found');

    const data: any = {
      name: rawProduct.name,
      desc: rawProduct.desc,
      category: rawProduct.category,
      price: rawProduct.price,
      tags: rawProduct.tags,
      stock: rawProduct.stock,
      isActive: rawProduct.isActive,
      isFeatured: rawProduct.isFeatured,
      images: rawProduct.images ?? [],
    };

    if (updateProductDto.name) data.name = updateProductDto.name;
    if (updateProductDto.desc) data.desc = updateProductDto.desc;
    if (updateProductDto.price) data.price = updateProductDto.price;
    if (updateProductDto.category) data.category = updateProductDto.category;
    if (updateProductDto.tags) data.tags = updateProductDto.tags;
    if (updateProductDto.stock !== undefined) data.stock = updateProductDto.stock;
    if (updateProductDto.isActive !== undefined) data.isActive = updateProductDto.isActive;
    if (updateProductDto.isFeatured !== undefined) data.isFeatured = updateProductDto.isFeatured;

    // ── Image sync logic ──────────────────────────────────────────────────────
    const existingKept: string[] = updateProductDto.existing_images ?? [];
    const newUploaded: string[] = updateProductDto.new_images ?? [];

    // current images stored in DB (bare filenames)
    const currentImages: string[] = rawProduct.images ?? [];

    // Find images that were removed by the user (not in the "keep" list)
    const removedImages = currentImages.filter(img => !existingKept.includes(img));

    // Delete removed image files from disk (fire-and-forget; log errors but don't fail the request)
    await Promise.allSettled(
      removedImages.map(async (filename) => {
        try {
          await unlink(join(UPLOADS_DIR, filename));
        } catch (err: any) {
          // File may already be gone — not a fatal error
          console.warn(`Could not delete image file "${filename}": ${err.message}`);
        }
      })
    );

    // Final image list = kept existing + newly uploaded
    data.images = [...existingKept, ...newUploaded];
    // ─────────────────────────────────────────────────────────────────────────

    const updatedProduct = await this.productsModel.findByIdAndUpdate(
      productId,
      { ...data },
      { new: true, lean: true },
    ).populate('category');
    if (!updatedProduct) throw new BadRequestException('Unable to update product');
    return this.mapProduct(updatedProduct) as unknown as IProduct;
  }

  async remove(productId: string): Promise<string> {
    // Also delete associated image files when a product is removed
    const product = await this.productsModel.findById(productId).lean();
    if (product?.images?.length) {
      await Promise.allSettled(
        product.images.map(async (filename: string) => {
          try {
            await unlink(join(UPLOADS_DIR, filename));
          } catch (err: any) {
            console.warn(`Could not delete image "${filename}": ${err.message}`);
          }
        })
      );
    }

    await this.productsModel.findByIdAndDelete(productId).catch((err) => {
      throw new BadRequestException(err);
    });
    return 'Product deleted';
  }
}
