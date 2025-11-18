import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Res,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileService } from './file.service';
import { UploadFileDto } from './models/dto/upload-file.dto';
import { FileOutput, FileModule } from './models/types/file.types';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@Controller('files')
export class FileController {
  constructor(private readonly service: FileService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query() uploadDto: UploadFileDto,
  ): Promise<FileOutput> {
    return await this.service.upload(
      file,
      uploadDto.module,
      uploadDto.entityId,
    );
  }

  @Get('admin/test')
  @HttpCode(HttpStatus.OK)
  test(): { message: string } {
    return { message: 'File module is working' };
  }

  @Get('module/:module/entity/:entityId')
  async findByModuleAndEntityId(
    @Param('module') module: string,
    @Param('entityId') entityId: string,
  ): Promise<FileOutput[]> {
    if (!Object.values(FileModule).includes(module as FileModule)) {
      throw new BadRequestException(
        `Invalid module. Must be one of: ${Object.values(FileModule).join(', ')}`,
      );
    }
    return await this.service.findByModuleAndEntityId(
      module as FileModule,
      entityId,
    );
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { stream, mimeType, fileName } = await this.service.getFileStream(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );
    stream.pipe(res);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<FileOutput> {
    return await this.service.findById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(id);
  }
}

