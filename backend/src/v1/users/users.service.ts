// prettier-ignore
import { BadRequestException, ForbiddenException, HttpException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, ObjectId } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersDocument } from './entities';
import { IUser, IUserPreview } from 'src/interfaces';
import { EmailService } from '../email/email.service';
import { Twilio } from 'twilio';

@Injectable()
export class UsersService {
  private twilioClient: Twilio;

  constructor(
    @InjectModel('users')
    private usersModel: Model<UsersDocument>,
    private readonly emailService: EmailService,
  ) {
    if (process.env.isPhoneVerificationOn === 'true') {
      this.twilioClient = new Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

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

  async updateProfile(userId: string, updateUserDto: UpdateUserDto): Promise<UsersDocument> {
    const updateData: any = {};
    if (updateUserDto.name) updateData.name = updateUserDto.name;
    if (updateUserDto.address) updateData.address = updateUserDto.address;

    const updatedUser = await this.usersModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) throw new BadRequestException('Unable to update user');
    return updatedUser;
  }

  async updateAvatar(userId: string, filename: string): Promise<UsersDocument> {
    const updated = await this.usersModel.findByIdAndUpdate(
      userId,
      { avatar: filename },
      { new: true }
    );
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }




  // ---- Phone Verification Logic ----

  async sendPhoneOtp(userId: string, phone: string): Promise<{ message: string }> {
    if (process.env.isPhoneVerificationOn !== 'true') {
      throw new BadRequestException('Phone verification is disabled');
    }

    const user = await this.usersModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const otp = this.generateOtp();
    const hashedOtp = await this.hashString(otp);
    const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.usersModel.findByIdAndUpdate(userId, {
      phone_otp: hashedOtp,
      phone_otp_expires_at: otp_expires_at,
    });

    try {
      await this.twilioClient.messages.create({
        body: `Your Haircare Market verification code is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      return { message: 'OTP sent successfully to your phone' };
    } catch (error: any) {
      throw new InternalServerErrorException(`Failed to send SMS: ${error.message}`);
    }
  }

  async verifyPhoneOtp(userId: string, phone: string, otp: string): Promise<{ message: string }> {
    if (process.env.isPhoneVerificationOn !== 'true') {
      throw new BadRequestException('Phone verification is disabled');
    }

    const user = await this.usersModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.phone_otp || !user.phone_otp_expires_at) {
      throw new BadRequestException('No OTP found. Please request a new one');
    }

    if (new Date() > user.phone_otp_expires_at) {
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    const isValid = await bcrypt.compare(otp, user.phone_otp);
    if (!isValid) throw new BadRequestException('Invalid OTP');

    await this.usersModel.findByIdAndUpdate(userId, {
      phone: phone,
      is_phone_verified: true,
      $unset: { phone_otp: '', phone_otp_expires_at: '' },
    });

    return { message: 'Phone verified successfully' };
  }

  async savePhone(userId: string, phone: string): Promise<{ message: string }> {
    // This is used when verification is OFF
    if (process.env.isPhoneVerificationOn === 'true') {
      throw new BadRequestException('Phone verification is required');
    }

    const user = await this.usersModel.findByIdAndUpdate(userId, {
      phone: phone,
      is_phone_verified: true // Implicitly true when verification config is off
    });

    if (!user) throw new NotFoundException('User not found');
    return { message: 'Phone number saved successfully' };
  }

  // ---- End Phone Verification Logic ----

  async initChangePassword(userId: string, currentPass: string): Promise<{ message: string }> {
    const user = await this.usersModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Verify current password
    const isValid = await bcrypt.compare(currentPass, user.password);
    if (!isValid) throw new UnauthorizedException('Current password is incorrect');

    // Generate and save OTP
    const otp = this.generateOtp();
    const hashedOtp = await this.hashString(otp);
    const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await this.usersModel.findByIdAndUpdate(userId, { reset_password_otp: hashedOtp, reset_password_otp_expires_at: otp_expires_at });

    // Send Email
    await this.emailService.sendPasswordResetOtpEmail(user.email, user.name, otp);

    return { message: 'Password reset OTP sent to your email.' };
  }

  async completeChangePassword(userId: string, otp: string, newPass: string): Promise<{ message: string }> {
    const user = await this.usersModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!user.reset_password_otp || !user.reset_password_otp_expires_at) throw new BadRequestException('Request expired or invalid. Please try again.');

    if (new Date() > user.reset_password_otp_expires_at) {
      throw new BadRequestException('OTP expired');
    }

    const isOtpValid = await bcrypt.compare(otp, user.reset_password_otp);
    if (!isOtpValid) throw new BadRequestException('Invalid OTP');

    const hashedNewPass = await this.hashString(newPass);

    await this.usersModel.findByIdAndUpdate(userId, {
      password: hashedNewPass,
      $unset: { reset_password_otp: '', reset_password_otp_expires_at: '' }
    });

    return { message: 'Password updated successfully' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersModel.findOne({ email });
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return { message: 'If an account exists with this email, a password reset OTP has been sent.' };
    }

    const otp = this.generateOtp();
    const hashedOtp = await this.hashString(otp);
    const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await this.usersModel.findByIdAndUpdate(user._id, { reset_password_otp: hashedOtp, reset_password_otp_expires_at: otp_expires_at });

    // Send Email
    await this.emailService.sendPasswordResetOtpEmail(user.email, user.name, otp);

    return { message: 'If an account exists with this email, a password reset OTP has been sent.' };
  }

  async resetPassword(email: string, otp: string, newPass: string): Promise<{ message: string }> {
    const user = await this.usersModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found');
    if (!user.reset_password_otp || !user.reset_password_otp_expires_at) throw new BadRequestException('Request expired or invalid. Please try again.');

    if (new Date() > user.reset_password_otp_expires_at) {
      throw new BadRequestException('OTP expired');
    }

    const isOtpValid = await bcrypt.compare(otp, user.reset_password_otp);
    if (!isOtpValid) throw new BadRequestException('Invalid OTP');

    const hashedNewPass = await this.hashString(newPass);

    await this.usersModel.findByIdAndUpdate(user._id, {
      password: hashedNewPass,
      $unset: { reset_password_otp: '', reset_password_otp_expires_at: '' }
    });

    return { message: 'Password updated successfully' };
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
