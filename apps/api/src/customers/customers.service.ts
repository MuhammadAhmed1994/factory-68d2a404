import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCustomerDto,
  CustomerListQueryDto,
  UpdateCustomerDto,
} from './customers.dto';

export interface CustomerRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerPage {
  customers: CustomerRecord[];
  page: number;
  limit: number;
  total: number;
}

const CUSTOMER_FIELDS = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCustomerDto): Promise<CustomerRecord> {
    const customer = await this.prisma.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        passwordHash: await bcrypt.hash(input.password, 12),
        role: UserRole.CUSTOMER,
      },
      select: CUSTOMER_FIELDS,
    });
    return customer;
  }

  async list(query: CustomerListQueryDto): Promise<CustomerPage> {
    const page = query.page ?? 1;
    const limit = 20;
    const search = query.search?.trim();
    const where = {
      role: UserRole.CUSTOMER,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [customers, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: CUSTOMER_FIELDS,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { customers, page, limit, total };
  }

  async findOne(id: string): Promise<CustomerRecord> {
    const customer = await this.prisma.user.findFirst({
      where: { id, role: UserRole.CUSTOMER },
      select: CUSTOMER_FIELDS,
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: string, input: UpdateCustomerDto): Promise<CustomerRecord> {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { name: input.name.trim() },
      select: CUSTOMER_FIELDS,
    });
  }

  async setActivation(id: string, isActive: boolean): Promise<CustomerRecord> {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: CUSTOMER_FIELDS,
    });
  }
}
