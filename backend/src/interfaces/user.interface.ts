export interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface IUser {
  _id?: string;
  email: string;
  password: string;
  name: string;
  avatar?: string;
  address?: IAddress;
  phone?: string;
  is_phone_verified?: boolean;
  is_verified?: boolean;
  otp?: string;
  otp_expires_at?: Date;
  phone_otp?: string;
  phone_otp_expires_at?: Date;
  reset_password_otp?: string;
  reset_password_otp_expires_at?: Date;
}

export type IUserPreview = Pick<IUser, '_id' | 'email' | 'name' | 'is_verified' | 'avatar' | 'address' | 'phone' | 'is_phone_verified'>;

export interface IUserSession {
  id: string;
}
