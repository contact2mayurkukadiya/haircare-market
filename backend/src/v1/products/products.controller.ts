// prettier-ignore
import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { IProduct } from 'src/interfaces';

@ApiTags('Products')
@Controller({ version: '1', path: 'products' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  // Public read-only routes — anyone can browse products
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Returns an array of all products.' })
  @Get()
  findAll(): Promise<IProduct[]> {
    return this.productsService.findAll();
  }

  @ApiOperation({ summary: 'Get a specific product by ID' })
  @ApiParam({ name: 'productId', type: 'string', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Returns the specified product details.' })
  @Get(':productId')
  findOne(@Param('productId') productId: string): Promise<IProduct> {
    return this.productsService.findOne(productId);
  }
}
