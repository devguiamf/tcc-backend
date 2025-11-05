import { Module } from '@nestjs/common';
import { EmailService } from './services/email.service';

@Module({
  imports: [],
  providers: [EmailService],
  exports: [EmailService],
})
export class SharedModule {}

