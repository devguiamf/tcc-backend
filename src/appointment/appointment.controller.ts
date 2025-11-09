import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './models/dto/create-appointment.dto';
import { UpdateAppointmentDto } from './models/dto/update-appointment.dto';
import { AppointmentOutput, AvailableTimeSlot } from './models/types/appointment.types';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';
import { CurrentUser } from '../core/decorators/current-user.decorator';

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateAppointmentDto,
    @CurrentUser() userId: string,
  ): Promise<AppointmentOutput> {
    return await this.service.create(createDto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() userId: string): Promise<AppointmentOutput[]> {
    return await this.service.findByUserId(userId);
  }

  @Get('store/:storeId')
  @UseGuards(JwtAuthGuard)
  async findByStoreId(
    @Param('storeId') storeId: string,
    @CurrentUser() userId: string,
  ): Promise<AppointmentOutput[]> {
    return await this.service.findByStoreId(storeId, userId);
  }

  @Get('available-slots/:storeId/:serviceId')
  async findAvailableTimeSlots(
    @Param('storeId') storeId: string,
    @Param('serviceId') serviceId: string,
    @Query('date') date: string,
  ): Promise<AvailableTimeSlot[]> {
    return await this.service.findAvailableTimeSlots(storeId, serviceId, date);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<AppointmentOutput> {
    return await this.service.findById(id, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppointmentDto,
    @CurrentUser() userId: string,
  ): Promise<AppointmentOutput> {
    return await this.service.update(id, updateDto, userId);
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

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<AppointmentOutput> {
    return await this.service.cancel(id, userId);
  }

  @Get('admin/test')
  @HttpCode(HttpStatus.OK)
  test(): { message: string } {
    return { message: 'Appointment module is working' };
  }
}

