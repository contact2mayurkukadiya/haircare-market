// prettier-ignore
import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Patch, HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';

import { CreateUserDto, UpdateUserDto, SendOtpDto, VerifyOtpDto, SendPhoneOtpDto, VerifyPhoneOtpDto, SavePhoneDto } from './dto';
import { UsersService } from './users.service';
import type { IUserPreview } from 'src/interfaces';
import { JwtAuthGuard } from '../guards';
import type { UsersDocument } from '.';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompleteChangePasswordDto, InitChangePasswordDto } from './dto/change-password.dto';
import { FileValidationPipe } from 'src/pipes/file-validation.pipe';


// Multer Options for Avatar
const avatarStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'avatars'),
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  }
});


@ApiTags('Users')
@Controller({ version: '1', path: 'users' })
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) { }

  private filterUser(user: UsersDocument): IUserPreview {
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      is_verified: user.is_verified,
      avatar: user.avatar
        ? `${process.env.SERVER_URL}/static/avatars/${user.avatar}`
        : undefined,
      address: user.address,
      phone: user.phone,
      is_phone_verified: user.is_phone_verified,
    };
  }

  // Upload Avatar
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @ApiOperation({ summary: 'Upload profile picture' })
  @UseInterceptors(FileInterceptor('file', { storage: avatarStorage }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File
  ): Promise<{ avatar: string }> {
    // Just returning the filename to be saved in DB via separate logic or saved here immediately
    // The requirement says: "on change of image, upload it on server and update the customer document"
    // So we update the DB here.
    const updatedUser = await this.usersService.updateAvatar(req.user.sub, file.filename);
    return { avatar: `${process.env.SERVER_URL}/static/avatars/${updatedUser.avatar}` };
  }

  // Update Profile Details (Address)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiOperation({ summary: 'Update profile details (Address)' })
  async updateProfile(
    @Request() req: any,
    @Body() dto: UpdateUserDto
  ): Promise<IUserPreview> {
    const updatedUser = await this.usersService.updateProfile(req.user.sub, dto);
    return this.filterUser(updatedUser);
  }


  // Change Password - Init
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('change-password/init')
  @ApiOperation({ summary: 'Initialize password change (Verify current & Send OTP)' })
  async initChangePassword(
    @Request() req: any,
    @Body() dto: InitChangePasswordDto
  ): Promise<{ message: string }> {
    return this.usersService.initChangePassword(req.user.sub, dto.currentPassword);
  }

  // Change Password - Complete
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('change-password/complete')
  @ApiOperation({ summary: 'Complete password change (Verify OTP & Save new password)' })
  async completeChangePassword(
    @Request() req: any,
    @Body() dto: CompleteChangePasswordDto
  ): Promise<{ message: string }> {
    return this.usersService.completeChangePassword(req.user.sub, dto.otp, dto.newPassword);
  }


  // Register a new user — OTP is auto-sent on registration
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'Registration successful. OTP sent to email.' })
  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<{ message: string }> {
    await this.usersService.create(createUserDto);
    return { message: 'Registration successful. Please check your email for the OTP verification code.' };
  }

  // Re-send OTP
  @ApiOperation({ summary: 'Resend OTP to email' })
  @ApiResponse({ status: 201, description: 'OTP resent successfully.' })
  @Post('send-otp')
  sendOtp(@Body() sendOtpDto: SendOtpDto): Promise<{ message: string }> {
    return this.usersService.sendOtp(sendOtpDto.email);
  }

  // Verify OTP
  @ApiOperation({ summary: 'Verify user OTP' })
  @ApiResponse({ status: 201, description: 'OTP verified successfully.' })
  @Post('verify-otp')
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<{ message: string }> {
    return this.usersService.verifyOtp(verifyOtpDto.email, verifyOtpDto.otp);
  }

  // Get current logged-in user profile
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  @ApiResponse({ status: 200, description: 'Returns the current user profile.' })
  async getProfile(@Request() req: any): Promise<IUserPreview> {
    const user = await this.usersService.findOne(req.user.sub);
    return this.filterUser(user);
  }

  // ---- Phone Verification Endpoints ----

  @Get('phone/config')
  @ApiOperation({ summary: 'Get phone verification configuration' })
  getPhoneConfig(): { isPhoneVerificationOn: boolean } {
    return { isPhoneVerificationOn: process.env.isPhoneVerificationOn === 'true' };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('phone/send-otp')
  @ApiOperation({ summary: 'Send OTP to phone number' })
  async sendPhoneOtp(@Request() req: any, @Body() dto: SendPhoneOtpDto): Promise<{ message: string }> {
    return this.usersService.sendPhoneOtp(req.user.sub, dto.phone);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('phone/verify')
  @ApiOperation({ summary: 'Verify phone number with OTP' })
  async verifyPhoneOtp(@Request() req: any, @Body() dto: VerifyPhoneOtpDto): Promise<{ message: string }> {
    return this.usersService.verifyPhoneOtp(req.user.sub, dto.phone, dto.otp);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('phone/save')
  @ApiOperation({ summary: 'Save phone number directly (when verification is OFF)' })
  async savePhone(@Request() req: any, @Body() dto: SavePhoneDto): Promise<{ message: string }> {
    return this.usersService.savePhone(req.user.sub, dto.phone);
  }

  // ---- End Phone Verification Endpoints ----

  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Returns an array of all users.' })
  @Get()
  findAll(): Promise<IUserPreview[]> {
    return this.usersService.findAll();
  }

  @ApiOperation({ summary: 'Get a specific user by ID' })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns the specified user details.' })
  @Get(':userId')
  async findOne(@Param('userId') userId: string): Promise<IUserPreview> {
    const user = await this.usersService.findOne(userId);
    return this.filterUser(user);
  }

  // @ApiBearerAuth('access-token')
  // @ApiOperation({ summary: 'Update an existing user' })
  // @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  // @ApiResponse({ status: 200, description: 'The user has been successfully updated.' })
  // @UseGuards(JwtAuthGuard)
  // @Put(':userId')
  // async update(
  //   @Request() req: { user: { sub: string } },
  //   @Param('userId') userId: string,
  //   @Body() updateUserDto: UpdateUserDto,
  // ): Promise<IUserPreview> {
  //   // Only allow the user to update their own profile
  //   const userFromDb = await this.usersService.findOne(req.user.sub);
  //   const updated = await this.usersService.update(userFromDb, userId, updateUserDto);
  //   return this.filterUser(updated);
  // }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'The user has been successfully deleted.' })
  @UseGuards(JwtAuthGuard)
  @Delete(':userId')
  remove(@Param('userId') userId: string): Promise<string> {
    return this.usersService.remove(userId);
  }
}
