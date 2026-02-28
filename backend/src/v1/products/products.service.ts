// prettier-ignore
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { unlink } from 'fs/promises';
import { join } from 'path';

import { ProductsDocument } from './entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { IProduct } from 'src/interfaces';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  search?: string;
  sort?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';
}


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

  async findAllWithFilters(
    page = 1,
    limit = 12,
    filters: ProductFilters = {},
  ): Promise<PaginatedResult<IProduct>> {
    const skip = (page - 1) * limit;

    const pipeline: any[] = [];

    // base filter: only active products for public listing
    pipeline.push({ $match: { isActive: true } });

    // category filter (expects category ObjectId as string)
    if (filters.category) {
      pipeline.push({
        $match: {
          category: filters.category,
        },
      });
    }

    // price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceCond: any = {};
      if (filters.minPrice !== undefined) priceCond.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) priceCond.$lte = filters.maxPrice;
      pipeline.push({ $match: { price: priceCond } });
    }

    // in-stock filter
    if (filters.inStock === true) {
      pipeline.push({ $match: { stock: { $gt: 0 } } });
    } else if (filters.inStock === false) {
      pipeline.push({ $match: { stock: { $lte: 0 } } });
    }

    // text search on name/desc (case-insensitive)
    if (filters.search && filters.search.trim().length > 0) {
      const regex = new RegExp(filters.search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [{ name: regex }, { desc: regex }],
        },
      });
    }

    // lookup category to mimic populate('category')
    pipeline.push({
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category',
      },
    });
    pipeline.push({
      $unwind: {
        path: '$category',
        preserveNullAndEmptyArrays: true,
      },
    });

    // sort
    const sortStage: any = {};
    switch (filters.sort) {
      case 'price-asc':
        sortStage.price = 1;
        break;
      case 'price-desc':
        sortStage.price = -1;
        break;
      case 'name-asc':
        sortStage.name = 1;
        break;
      case 'name-desc':
        sortStage.name = -1;
        break;
      default:
        sortStage.createdAt = -1;
    }
    pipeline.push({ $sort: sortStage });

    // pagination + total (using $facet)
    pipeline.push({
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    });

    const result = await this.productsModel.aggregate(pipeline).exec();
    const aggResult = result[0] || { data: [], totalCount: [] };

    const total = aggResult.totalCount[0]?.count || 0;
    const products = (aggResult.data as any[]).map(p => this.mapProduct(p)) as IProduct[];

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
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
