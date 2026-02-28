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
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 24,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc',
  ) {
    return this.productsService.findAllWithFilters(
      +page,
      +limit,
      {
        category,
        minPrice: minPrice ? +minPrice : undefined,
        maxPrice: maxPrice ? +maxPrice : undefined,
        inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
        search,
        sort
      }
    );
  }

  @ApiOperation({ summary: 'Get a specific product by ID' })
  @ApiParam({ name: 'productId', type: 'string', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Returns the specified product details.' })
  @Get(':productId')
  findOne(@Param('productId') productId: string): Promise<IProduct> {
    return this.productsService.findOne(productId);
  }
}
