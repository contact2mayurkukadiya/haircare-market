// prettier-ignore
import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';

import { CreateUserDto, UpdateUserDto, LoginUserDto, VerifyOtpDto, SendOtpDto } from './dto';
import { UsersService } from './users.service';
import type { IUserPreview } from 'src/interfaces';
import { LocalAuthGuard } from '../guards';
import type { UsersDocument } from '.';
import { User } from '../decorators';

@ApiTags('Users')
@Controller({ version: '1', path: 'users' })
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  private filterUser(user: UsersDocument): IUserPreview {
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      is_verified: user.is_verified,
    };
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

  // Login — only verified users can login
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({ status: 201, description: 'Returns user profile details upon successful login.' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@User() user: UsersDocument): IUserPreview {
    if (!user) throw new NotFoundException('User not found');
    if (!user.is_verified) {
      throw new ForbiddenException('Please verify your email before logging in');
    }
    return this.filterUser(user);
  }

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

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing user' })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'The user has been successfully updated.' })
  @UseGuards(LocalAuthGuard)
  @Put(':userId')
  async update(
    @User() user: UsersDocument,
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<IUserPreview> {
    const updated = await this.usersService.update(user, userId, updateUserDto);
    return this.filterUser(updated);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'The user has been successfully deleted.' })
  @UseGuards(LocalAuthGuard)
  @Delete(':userId')
  remove(
    @Param('userId') userId: string,
    // eslint-disable-next-line no-unused-vars
    @Body() _loginUserDto: LoginUserDto,
  ): Promise<string> {
    return this.usersService.remove(userId);
  }
}
