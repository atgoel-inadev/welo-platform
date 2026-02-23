import { Controller, Get, Post, Body, Param, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerService } from '../services/customer.service';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Acme Corporation', description: 'Customer name' })
  name: string;

  @ApiProperty({ example: 'admin@acme.com', description: 'Customer contact email' })
  email: string;

  @ApiPropertyOptional({ example: 'enterprise', description: 'Subscription tier (free, pro, enterprise)' })
  subscription?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Acme Corp (Updated)', description: 'Customer name' })
  name?: string;

  @ApiPropertyOptional({ example: 'new@acme.com', description: 'Customer contact email' })
  email?: string;

  @ApiPropertyOptional({ example: 'pro', description: 'Subscription tier' })
  subscription?: string;
}

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: 'List all customers' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  async listCustomers() {
    return this.customerService.listCustomers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getCustomer(@Param('id') id: string) {
    return this.customerService.getCustomer(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  async createCustomer(@Body() createDto: CreateCustomerDto) {
    return this.customerService.createCustomer(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  async updateCustomer(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerDto,
  ) {
    return this.customerService.updateCustomer(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({ status: 204, description: 'Customer deleted' })
  async deleteCustomer(@Param('id') id: string) {
    return this.customerService.deleteCustomer(id);
  }
}
