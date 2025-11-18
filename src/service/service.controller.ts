import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FormDataParseInterceptor } from '../core/interceptors/form-data-parse.interceptor';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './models/dto/create-service.dto';
import { UpdateServiceDto } from './models/dto/update-service.dto';
import { ServiceOutput } from './models/types/service.types';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';
import { CurrentUser } from '../core/decorators/current-user.decorator';

@Controller('services')
export class ServiceController {
  constructor(private readonly service: ServiceService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'), FormDataParseInterceptor)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateServiceDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() userId: string,
  ): Promise<ServiceOutput> {
    return await this.service.create(createDto, userId, file);
  }

  @Get()
  async findAll(): Promise<ServiceOutput[]> {
    return await this.service.findAll();
  }

  @Get('my-services')
  @UseGuards(JwtAuthGuard)
  async findMyServices(@CurrentUser() userId: string): Promise<ServiceOutput[]> {
    return await this.service.findByUserId(userId);
  }

  @Get('store/:storeId')
  async findByStoreId(@Param('storeId') storeId: string): Promise<ServiceOutput[]> {
    return await this.service.findByStoreId(storeId);
  }

  @Post(':id/upload-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() userId: string,
  ): Promise<ServiceOutput> {
    return await this.service.uploadImage(file, id, userId);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ServiceOutput> {
    return await this.service.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'), FormDataParseInterceptor)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() userId: string,
  ): Promise<ServiceOutput> {
    return await this.service.update(id, updateDto, userId, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.service.delete(id, userId);
  }

  @Get('admin/test')
  @HttpCode(HttpStatus.OK)
  test(): { message: string } {
    return { message: 'Service module is working' };
  }
}

