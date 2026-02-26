// prettier-ignore
import { Controller, Post, Get, Body, Param, Put, Delete, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { AdminService, type IAdminPreview } from './admin.service';
import { ProductsService } from '../products/products.service';
import { CreateProductDto, UpdateProductDto } from '../products/dto';
import { IProduct } from 'src/interfaces';
import { AdminLocalAuthGuard } from './guards/admin-local-auth.guard';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminDocument } from './entities/admin.schema';

@ApiTags('Admin')
@Controller({ version: '1', path: 'admin' })
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly productsService: ProductsService,
    ) { }

    /**************************************************************
     * AUTH
     **************************************************************/

    @ApiOperation({ summary: 'Admin login' })
    @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } })
    @ApiResponse({ status: 201, description: 'Returns admin profile details upon successful login.' })
    @UseGuards(AdminLocalAuthGuard)
    @Post('login')
    login(@Request() req: { user: AdminDocument }): IAdminPreview {
        const admin = req.user;
        if (!admin) throw new UnauthorizedException('Invalid credentials');
        // Store admin ID manually in session (separate from user session)
        (req as any).session['adminId'] = admin._id?.toString();
        return { _id: admin._id?.toString(), name: admin.name, email: admin.email };
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Admin logout' })
    @ApiResponse({ status: 201, description: 'Successfully logged out.' })
    @UseGuards(AdminAuthGuard)
    @Post('logout')
    logout(@Request() req: { session: Record<string, unknown> }): { message: string } {
        delete req.session['adminId'];
        return { message: 'Logged out successfully' };
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current admin profile' })
    @ApiResponse({ status: 200, description: 'Returns the currently logged-in admin details.' })
    @UseGuards(AdminAuthGuard)
    @Get('me')
    async getProfile(@Request() req: { session: Record<string, unknown> }): Promise<IAdminPreview> {
        const adminId = req.session['adminId'] as string;
        const admin = await this.adminService.findOne(adminId);
        return { _id: admin._id?.toString(), name: admin.name, email: admin.email };
    }

    /**************************************************************
     * PRODUCTS
     **************************************************************/

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all products (Admin)' })
    @ApiResponse({ status: 200, description: 'Returns an array of all products.' })
    @UseGuards(AdminAuthGuard)
    @Get('products')
    getAllProducts(): Promise<IProduct[]> {
        return this.productsService.findAll();
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get a specific product by ID (Admin)' })
    @ApiParam({ name: 'productId', type: 'string', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Returns the specified product details.' })
    @UseGuards(AdminAuthGuard)
    @Get('products/:productId')
    getProduct(@Param('productId') productId: string): Promise<IProduct> {
        return this.productsService.findOne(productId);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new product' })
    @ApiResponse({ status: 201, description: 'The product has been successfully created.' })
    @UseGuards(AdminAuthGuard)
    @Post('products')
    createProduct(@Body() createProductDto: CreateProductDto): Promise<IProduct> {
        return this.productsService.create(createProductDto);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update an existing product' })
    @ApiParam({ name: 'productId', type: 'string', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'The product has been successfully updated.' })
    @UseGuards(AdminAuthGuard)
    @Put('products/:productId')
    updateProduct(
        @Param('productId') productId: string,
        @Body() updateProductDto: UpdateProductDto,
    ): Promise<IProduct> {
        return this.productsService.update(productId, updateProductDto);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a product' })
    @ApiParam({ name: 'productId', type: 'string', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'The product has been successfully deleted.' })
    @UseGuards(AdminAuthGuard)
    @Delete('products/:productId')
    removeProduct(@Param('productId') productId: string): Promise<string> {
        return this.productsService.remove(productId);
    }
}
