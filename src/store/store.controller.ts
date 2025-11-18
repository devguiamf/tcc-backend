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
import { StoreService } from './store.service';
import { CreateStoreDto } from './models/dto/create-store.dto';
import { UpdateStoreDto } from './models/dto/update-store.dto';
import { StoreOutput } from './models/types/store.types';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@Controller('stores')
export class StoreController {
  constructor(private readonly service: StoreService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'), FormDataParseInterceptor)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateStoreDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<StoreOutput> {
    return await this.service.create(createDto, file);
  }

  @Get()
  async findAll(): Promise<StoreOutput[]> {
    return await this.service.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<StoreOutput> {
    return await this.service.findById(id);
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string): Promise<StoreOutput> {
    return await this.service.findByUserId(userId);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'), FormDataParseInterceptor)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateStoreDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<StoreOutput> {
    return await this.service.update(id, updateDto, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(id);
  }

  @Get('admin/test')
  @HttpCode(HttpStatus.OK)
  test(): { message: string } {
    return { message: 'Store module is working' };
  }
}

