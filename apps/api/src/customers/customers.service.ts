import { randomBytes } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCustomerDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from './customers.dto';

export interface CustomerRecord {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerListResult {
  customers: CustomerRecord[];
  page: number;
  limit: number;
  total: number;
}

const customerSelect = {
  id: true,
  email: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCustomerDto): Promise<CustomerRecord> {
    // The account password is never returned or stored in plaintext. Password setup is outside
    // this management API; a random unshared value prevents a usable default credential.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('base64url'), 10);
    return this.prisma.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        passwordHash,
        role: UserRole.CUSTOMER,
        isActive: true,
      },
      select: customerSelect,
    });
  }

  async list(query: ListCustomersQueryDto): Promise<CustomerListResult> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 20);
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
        select: customerSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { customers, page, limit, total };
  }

  async getById(id: string): Promise<CustomerRecord> {
    const customer = await this.prisma.user.findFirst({
      where: { id, role: UserRole.CUSTOMER },
      select: customerSelect,
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: string, input: UpdateCustomerDto): Promise<CustomerRecord> {
    await this.ensureCustomerExists(id);
    return this.prisma.user.update({
      where: { id },
      data: input.name === undefined ? {} : { name: input.name.trim() },
      select: customerSelect,
    });
  }

  async setActivation(id: string, isActive: boolean): Promise<CustomerRecord> {
    await this.ensureCustomerExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: customerSelect,
    });
  }

  private async ensureCustomerExists(id: string): Promise<void> {
    const customer = await this.prisma.user.findFirst({
      where: { id, role: UserRole.CUSTOMER },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
  }
}
