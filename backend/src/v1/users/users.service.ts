// prettier-ignore
import { BadRequestException, ForbiddenException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, ObjectId } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersDocument } from './entities';
import { IUser, IUserPreview } from 'src/interfaces';
import { EmailService } from '../email/email.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('users')
    private usersModel: Model<UsersDocument>,
    private readonly emailService: EmailService,
  ) { }

  private async hashString(str: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(str, salt);
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async create(createUserDto: CreateUserDto): Promise<UsersDocument> {
    if (await this.usersModel.findOne({ email: createUserDto.email })) {
      throw new HttpException('email already in use', 400);
    }

    const hashedPass = await this.hashString(createUserDto.password);
    const otp = this.generateOtp();
    const hashedOtp = await this.hashString(otp);
    const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const newUser = new this.usersModel({
      ...createUserDto,
      password: hashedPass,
      otp: hashedOtp,
      otp_expires_at,
      is_verified: false,
    });

    const createdUser = await newUser.save();
    if (!createdUser) throw new InternalServerErrorException();

    // Send OTP email
    await this.emailService.sendOtpEmail(createUserDto.email, createUserDto.name, otp);

    return createdUser;
  }

  async sendOtp(email: string): Promise<{ message: string }> {
    const user = await this.usersModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found');
    if (user.is_verified) throw new BadRequestException('User is already verified');

    const otp = this.generateOtp();
    const hashedOtp = await this.hashString(otp);
    const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await this.usersModel.findByIdAndUpdate(user._id, { otp: hashedOtp, otp_expires_at });
    await this.emailService.sendOtpEmail(email, user.name, otp);

    return { message: 'OTP sent to your email address' };
  }

  async verifyOtp(email: string, otp: string): Promise<{ message: string }> {
    const user = await this.usersModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found');
    if (user.is_verified) throw new BadRequestException('User is already verified');
    if (!user.otp || !user.otp_expires_at) {
      throw new BadRequestException('No OTP found. Please request a new one');
    }
    if (new Date() > user.otp_expires_at) {
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    const isValid = await bcrypt.compare(otp, user.otp);
    if (!isValid) throw new BadRequestException('Invalid OTP');

    await this.usersModel.findByIdAndUpdate(user._id, {
      is_verified: true,
      $unset: { otp: '', otp_expires_at: '' },
    });

    return { message: 'Email verified successfully' };
  }

  async findAll(): Promise<IUserPreview[]> {
    const users: IUserPreview[] = await this.usersModel.find(
      {},
      'name email _id is_verified',
    );
    if (!users) throw new InternalServerErrorException();
    return users;
  }

  async findOne(id: string | ObjectId): Promise<UsersDocument> {
    const user = await this.usersModel.findById(id);
    if (!user) throw new HttpException('Unable to find any user', 500);
    return user;
  }

  async findByEmail(email: string): Promise<UsersDocument | undefined> {
    const user = await this.usersModel.findOne({ email });
    if (user) return user;
    throw new NotFoundException('User not found');
  }

  async update(
    user: UsersDocument,
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UsersDocument> {
    if (user._id.toString() !== userId) {
      throw new ForbiddenException('You are forbidden from changing this data');
    }

    const updateQueue: IUser = {
      name: user.name,
      email: user.email,
      password: user.password,
    };

    if (updateUserDto.new_password) {
      if (!updateUserDto.new_confirm_password) {
        throw new HttpException('confirm_password is required', 400);
      }
      if (updateUserDto.new_password === updateUserDto.new_confirm_password) {
        updateQueue.password = await this.hashString(updateUserDto.new_password);
      } else throw new HttpException("passwords don't match", 400);
    }
    if (updateUserDto.new_email) updateQueue.email = updateUserDto.new_email;
    if (updateUserDto.new_name) updateQueue.name = updateUserDto.new_name;

    const updatedUser = await this.usersModel.findByIdAndUpdate(
      userId,
      { ...updateQueue },
      { new: true },
    );
    if (!updatedUser) {
      throw new BadRequestException('Unable to update user, please try again later');
    }
    return updatedUser;
  }

  async remove(userId: string): Promise<string> {
    await this.usersModel
      .findByIdAndDelete(userId)
      .catch((err: NativeError) => {
        throw new BadRequestException(err);
      });
    return 'User removed';
  }
}
