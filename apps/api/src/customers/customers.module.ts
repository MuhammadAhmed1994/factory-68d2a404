import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [CustomersService, AuthGuard, RolesGuard],
  exports: [CustomersService],
})
export class CustomersModule {}
