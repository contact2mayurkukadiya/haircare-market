export interface IUser {
  _id?: string;
  email: string;
  password: string;
  name: string;
  is_verified?: boolean;
  otp?: string;
  otp_expires_at?: Date;
}

export type IUserPreview = Pick<IUser, '_id' | 'email' | 'name' | 'is_verified'>;

export interface IUserSession {
  id: string;
}
