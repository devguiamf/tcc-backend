import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetCodeEntity } from '../models/password-reset-code.entity';

@Injectable()
export class PasswordResetCodeRepository {
  constructor(
    @InjectRepository(PasswordResetCodeEntity)
    private readonly repository: Repository<PasswordResetCodeEntity>,
  ) {}

  async create(email: string, code: string, expiresAt: Date): Promise<PasswordResetCodeEntity> {
    const resetCode = this.repository.create({
      email,
      code,
      expiresAt,
      isUsed: false,
    });
    return await this.repository.save(resetCode);
  }

  async findByCode(code: string): Promise<PasswordResetCodeEntity | null> {
    return await this.repository.findOne({
      where: { code, isUsed: false },
    });
  }

  async markAsUsed(id: string): Promise<void> {
    await this.repository.update(id, { isUsed: true });
  }

  async invalidateUserCodes(email: string): Promise<void> {
    await this.repository.update(
      { email, isUsed: false },
      { isUsed: true },
    );
  }
}

