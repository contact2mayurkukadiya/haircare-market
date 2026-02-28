// prettier-ignore
import { Controller, Get, Post, Body, Param, Delete, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { IProduct } from 'src/interfaces';

@ApiTags('Products')
@Controller({ version: '1', path: 'products' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @ApiOperation({ summary: 'Get all products (paginated)' })
  @ApiResponse({ status: 200, description: 'Returns paginated products.' })
  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 12,
  ) {
    return this.productsService.findAll(+page, +limit);
  }

  @ApiOperation({ summary: 'Get a specific product by ID' })
  @ApiParam({ name: 'productId', type: 'string', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Returns the specified product details.' })
  @Get(':productId')
  findOne(@Param('productId') productId: string): Promise<IProduct> {
    return this.productsService.findOne(productId);
  }
}
