import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ICategory } from 'src/interfaces';

export type CategoriesDocument = Categories & Document<string>;

@Schema({ timestamps: true })
class Categories implements ICategory {
    @Prop({ required: true, unique: true })
    name!: string;

    @Prop()
    desc?: string;

    @Prop({ default: true })
    isActive!: boolean;
}

export const CategoriesSchema = SchemaFactory.createForClass(Categories);
