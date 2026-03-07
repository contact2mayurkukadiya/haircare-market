import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IUser, IAddress } from 'src/interfaces';

export type UsersDocument = Users & Document<string>;


@Schema({ _id: false })
class Address implements IAddress {
  @Prop() street?: string;
  @Prop() city?: string;
  @Prop() state?: string;
  @Prop() zip?: string;
  @Prop() country?: string;
}

const AddressSchema = SchemaFactory.createForClass(Address);


@Schema({ timestamps: true })
class Users implements IUser {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  avatar?: string;

  @Prop({ type: AddressSchema })
  address?: Address;

  @Prop()
  phone?: string;

  @Prop({ default: false })
  is_phone_verified?: boolean;

  @Prop({ default: false })
  is_verified!: boolean;

  @Prop()
  otp?: string;

  @Prop()
  otp_expires_at?: Date;

  @Prop()
  phone_otp?: string;

  @Prop()
  phone_otp_expires_at?: Date;

  @Prop()
  reset_password_otp?: string;

  @Prop()
  reset_password_otp_expires_at?: Date;
}

export const UsersSchema = SchemaFactory.createForClass(Users);
