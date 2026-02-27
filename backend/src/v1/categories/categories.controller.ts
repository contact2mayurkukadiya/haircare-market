import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard'; // Corrected path

@ApiTags('Categories')
@Controller({ version: '1', path: 'categories' })
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get('getAll')
    @ApiOperation({ summary: 'Get all categories' })
    @ApiResponse({ status: 200, description: 'Return all categories.' })
    @HttpCode(HttpStatus.OK)
    findAll() {
        return this.categoriesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a category by id' })
    @ApiResponse({ status: 200, description: 'Return a single category.' })
    @ApiResponse({ status: 404, description: 'Category not found.' })
    @HttpCode(HttpStatus.OK)
    findOne(@Param('id') id: string) {
        return this.categoriesService.findOne(id);
    }

    @Post('create')
    @ApiBearerAuth('access-token')
    @UseGuards(AdminAuthGuard)
    @ApiOperation({ summary: 'Create a new category (Admin Only)' })
    @ApiResponse({ status: 201, description: 'The category has been successfully created.' })
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createCategoryDto: CreateCategoryDto) {
        return this.categoriesService.create(createCategoryDto);
    }

    @Patch(':id')
    @ApiBearerAuth('access-token')
    @UseGuards(AdminAuthGuard)
    @ApiOperation({ summary: 'Update a category (Admin Only)' })
    @ApiResponse({ status: 200, description: 'The category has been successfully updated.' })
    @HttpCode(HttpStatus.OK)
    update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
        return this.categoriesService.update(id, updateCategoryDto);
    }

    @Delete(':id')
    @ApiBearerAuth('access-token')
    @UseGuards(AdminAuthGuard)
    @ApiOperation({ summary: 'Delete a category (Admin Only)' })
    @ApiResponse({ status: 200, description: 'The category has been successfully deleted.' })
    @HttpCode(HttpStatus.OK)
    remove(@Param('id') id: string) {
        return this.categoriesService.remove(id);
    }
}
