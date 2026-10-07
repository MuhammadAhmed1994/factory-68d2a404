import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateCustomerDto,
  CustomerActivationDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from './customers.dto';
import {
  CustomerListResult,
  CustomerRecord,
  CustomersService,
} from './customers.service';

@Controller('customers')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  list(@Query() query: ListCustomersQueryDto): Promise<CustomerListResult> {
    return this.customersService.list(query);
  }

  @Post()
  create(@Body() input: CreateCustomerDto): Promise<CustomerRecord> {
    return this.customersService.create(input);
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<CustomerRecord> {
    return this.customersService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() input: UpdateCustomerDto,
  ): Promise<CustomerRecord> {
    return this.customersService.update(id, input);
  }

  @Patch(':id/activation')
  setActivation(
    @Param('id') id: string,
    @Body() input: CustomerActivationDto,
  ): Promise<CustomerRecord> {
    return this.customersService.setActivation(id, input.isActive);
  }
}
