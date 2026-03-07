import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { unlink } from 'fs/promises';

@Injectable()
export class FileValidationPipe implements PipeTransform {
    // Configuration: 2MB limit, specific mime types
    private readonly maxSize = 2 * 1024 * 1024; // 2MB
    private readonly allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    async transform(value: Express.Multer.File) {
        if (!value) {
            throw new BadRequestException('File is required');
        }

        // 1. Validate MIME Type
        if (!this.allowedMimes.includes(value.mimetype)) {
            await this.cleanup(value.path);
            throw new BadRequestException(`Invalid file type. Allowed: ${this.allowedMimes.join(', ')}`);
        }

        // 2. Validate Size
        if (value.size > this.maxSize) {
            await this.cleanup(value.path);
            throw new BadRequestException(`File size too large. Max allowed: ${this.maxSize / 1024 / 1024}MB`);
        }

        return value;
    }

    // Helper to delete the file if validation fails
    private async cleanup(filePath: string): Promise<void> {
        try {
            await unlink(filePath);
        } catch (err) {
            console.warn(`Failed to delete invalid file at ${filePath}:`, err);
        }
    }
}