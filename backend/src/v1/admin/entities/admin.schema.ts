import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminDocument = Admin & Document<string>;

@Schema({ timestamps: true })
export class Admin {
    @Prop({ required: true, unique: true })
    email!: string;

    @Prop({ required: true })
    password!: string;

    @Prop({ required: true })
    name!: string;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
export const AdminModel = [{ name: 'admins', schema: AdminSchema }];
