import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IUser } from 'src/interfaces';

export type UsersDocument = Users & Document<string>;

@Schema({ timestamps: true })
class Users implements IUser {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: false })
  is_verified!: boolean;

  @Prop()
  otp?: string;

  @Prop()
  otp_expires_at?: Date;
}

export const UsersSchema = SchemaFactory.createForClass(Users);
