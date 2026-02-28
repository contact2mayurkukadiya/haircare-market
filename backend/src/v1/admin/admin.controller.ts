// prettier-ignore
import { Controller, Post, Get, Body, Param, Put, Delete, UseGuards, Request, UnauthorizedException, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { diskStorage } from 'multer';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { AdminService, type IAdminPreview } from './admin.service';
import { ProductsService } from '../products/products.service';
import { CreateProductDto, UpdateProductDto } from '../products/dto';
import { IProduct } from 'src/interfaces';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import type { JwtAdminPayload } from './strategies/admin-jwt.strategy';

@ApiTags('Admin')
@Controller({ version: '1', path: 'admin' })
export class AdminController {
    // Shared multer storage configuration for product images
    private static multerOptions = {
        storage: diskStorage({
            destination: './uploads/products',
            filename: (req, file, cb) => {
                const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
                cb(null, uniqueName);
            },
        }),
    };
    constructor(
        private readonly adminService: AdminService,
        private readonly productsService: ProductsService,
    ) { }

    /**************************************************************
     * AUTH
     **************************************************************/

    @ApiOperation({ summary: 'Admin login' })
    @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } })
    @ApiResponse({ status: 201, description: 'Returns JWT access token and admin profile upon successful login.' })
    @Post('login')
    async login(@Body() body: { email: string; password: string }): Promise<{ access_token: string; admin: IAdminPreview }> {
        const admin = await this.adminService.validateAdmin(body.email, body.password);
        const { access_token } = this.adminService.signAdminToken(admin);
        return {
            access_token,
            admin: { _id: admin._id?.toString(), name: admin.name, email: admin.email },
        };
    }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get current admin profile' })
    @ApiResponse({ status: 200, description: 'Returns the currently logged-in admin details.' })
    @UseGuards(AdminAuthGuard)
    @Get('me')
    async getProfile(@Request() req: { user: JwtAdminPayload }): Promise<IAdminPreview> {
        const admin = await this.adminService.findOne(req.user.sub);
        return { _id: admin._id?.toString(), name: admin.name, email: admin.email };
    }

    /**************************************************************
     * PRODUCTS
     **************************************************************/

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get all products (Admin)' })
    @ApiResponse({ status: 200, description: 'Returns an array of all products.' })
    @UseGuards(AdminAuthGuard)
    @Get('products')
    async getAllProducts(): Promise<IProduct[]> {
        // Admin needs all products — use large limit, return only data array
        const result = await this.productsService.findAll(1, 1000);
        return result.data;
    }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get a specific product by ID (Admin)' })
    @ApiParam({ name: 'productId', type: 'string', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Returns the specified product details.' })
    @UseGuards(AdminAuthGuard)
    @Get('products/:productId')
    getProduct(@Param('productId') productId: string): Promise<IProduct> {
        return this.productsService.findOne(productId);
    }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Create a new product' })
    @ApiResponse({ status: 201, description: 'The product has been successfully created.' })
    @UseGuards(AdminAuthGuard)
    @UseInterceptors(FilesInterceptor('images', 10, AdminController.multerOptions))
    @Post('products')
    createProduct(
        @UploadedFiles() files: Express.Multer.File[],
        @Body() createProductDto: CreateProductDto
    ): Promise<IProduct> {
        if (files && files.length > 0) {
            createProductDto.images = files.map((file) => file.filename);
        }
        return this.productsService.create(createProductDto);
    }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Update an existing product' })
    @ApiParam({ name: 'productId', type: 'string', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'The product has been successfully updated.' })
    @UseGuards(AdminAuthGuard)
    @UseInterceptors(FilesInterceptor('new_images', 10, AdminController.multerOptions))
    @Put('products/:productId')
    updateProduct(
        @Param('productId') productId: string,
        @UploadedFiles() files: Express.Multer.File[],
        @Body() updateProductDto: UpdateProductDto,
    ): Promise<IProduct> {
        if (files && files.length > 0) {
            updateProductDto.new_images = files.map((file) => file.filename);
        }
        return this.productsService.update(productId, updateProductDto);
    }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Delete a product' })
    @ApiParam({ name: 'productId', type: 'string', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'The product has been successfully deleted.' })
    @UseGuards(AdminAuthGuard)
    @Delete('products/:productId')
    removeProduct(@Param('productId') productId: string): Promise<string> {
        return this.productsService.remove(productId);
    }
}
