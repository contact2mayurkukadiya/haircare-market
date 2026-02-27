import { ConflictException, Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesDocument } from './entities/category.schema';
import { ICategory } from 'src/interfaces';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectModel('categories')
        private readonly categoriesModel: Model<CategoriesDocument>,
    ) { }

    async create(createCategoryDto: CreateCategoryDto): Promise<{ message: string; category: ICategory }> {
        try {
            const existingCategory = await this.categoriesModel.findOne({ name: createCategoryDto.name });
            if (existingCategory) {
                throw new ConflictException('Category with this name already exists');
            }

            const createdCategory = new this.categoriesModel(createCategoryDto);
            const category = await createdCategory.save();

            return {
                message: 'Category created successfully',
                category,
            };
        } catch (error: any) {
            if (error instanceof ConflictException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    async findAll(): Promise<ICategory[]> {
        try {
            return await this.categoriesModel.find().exec();
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    async findOne(id: string): Promise<ICategory> {
        try {
            const category = await this.categoriesModel.findById(id).exec();
            if (!category) {
                throw new NotFoundException(`Category with ID ${id} not found`);
            }
            return category;
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<{ message: string; category: ICategory }> {
        try {
            const { new_name, new_desc, new_isActive } = updateCategoryDto;
            const updateData: any = {};

            if (new_name !== undefined) updateData.name = new_name;
            if (new_desc !== undefined) updateData.desc = new_desc;
            if (new_isActive !== undefined) updateData.isActive = new_isActive;

            if (Object.keys(updateData).length === 0) {
                throw new BadRequestException('No valid fields to update');
            }

            if (new_name) {
                const existingCategory = await this.categoriesModel.findOne({ name: new_name, _id: { $ne: id } });
                if (existingCategory) {
                    throw new ConflictException('Category with this name already exists');
                }
            }

            const updatedCategory = await this.categoriesModel.findByIdAndUpdate(id, updateData, { new: true }).exec();

            if (!updatedCategory) {
                throw new NotFoundException(`Category with ID ${id} not found`);
            }

            return {
                message: 'Category updated successfully',
                category: updatedCategory,
            };
        } catch (error: any) {
            if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    async remove(id: string): Promise<{ message: string }> {
        try {
            const deletedCategory = await this.categoriesModel.findByIdAndDelete(id).exec();
            if (!deletedCategory) {
                throw new NotFoundException(`Category with ID ${id} not found`);
            }
            return { message: 'Category deleted successfully' };
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }
}
