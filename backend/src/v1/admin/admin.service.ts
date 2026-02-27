// prettier-ignore
import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AdminDocument } from './entities/admin.schema';
import { CreateAdminDto } from './dto/create-admin.dto';

export interface IAdminPreview {
    _id?: string;
    name: string;
    email: string;
}

@Injectable()
export class AdminService implements OnModuleInit {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        @InjectModel('admins')
        private readonly adminModel: Model<AdminDocument>,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
    ) { }

    signAdminToken(admin: AdminDocument): { access_token: string } {
        const payload = {
            sub: admin._id,
            email: admin.email,
            name: admin.name,
            role: 'admin',
        };
        return { access_token: this.jwtService.sign(payload) };
    }

    // Seed a default admin on startup if none exists
    async onModuleInit(): Promise<void> {
        const count = await this.adminModel.countDocuments();
        if (count === 0) {
            const email = this.configService.get<string>('admin.email') || 'admin@haircaremarket.com';
            const password = this.configService.get<string>('admin.password') || 'Admin@12345';
            const name = this.configService.get<string>('admin.name') || 'Admin';
            const hashedPassword = await bcrypt.hash(password, 10);
            await this.adminModel.create({ email, password: hashedPassword, name });
            this.logger.log(`Default admin seeded: ${email}`);
        }
    }

    async validateAdmin(email: string, password: string): Promise<AdminDocument> {
        const admin = await this.adminModel.findOne({ email });
        if (!admin) {
            throw new NotFoundException('Admin not found. Please check your credentials.');
        }
        const isValid = await bcrypt.compare(password, admin.password);
        if (!isValid) {
            throw new UnauthorizedException('Invalid email or password');
        }
        return admin;
    }

    async findOne(id: string): Promise<AdminDocument> {
        const admin = await this.adminModel.findById(id);
        if (!admin) throw new NotFoundException('Admin not found');
        return admin;
    }

    async create(createAdminDto: CreateAdminDto): Promise<IAdminPreview> {
        const exists = await this.adminModel.findOne({ email: createAdminDto.email });
        if (exists) throw new BadRequestException('An admin with this email already exists');

        const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);
        const newAdmin = await this.adminModel.create({
            ...createAdminDto,
            password: hashedPassword,
        });
        if (!newAdmin) throw new InternalServerErrorException();

        return { _id: newAdmin._id, name: newAdmin.name, email: newAdmin.email };
    }
}
