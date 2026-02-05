import { Controller, Get, Post, Body, Param, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { CustomerService } from '../services/customer.service';

export class CreateCustomerDto {
  name: string;
  email: string;
  subscription?: string;
}

export class UpdateCustomerDto {
  name?: string;
  email?: string;
  subscription?: string;
}

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  async listCustomers() {
    return this.customerService.listCustomers();
  }

  @Get(':id')
  async getCustomer(@Param('id') id: string) {
    return this.customerService.getCustomer(id);
  }

  @Post()
  async createCustomer(@Body() createDto: CreateCustomerDto) {
    return this.customerService.createCustomer(createDto);
  }

  @Patch(':id')
  async updateCustomer(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerDto,
  ) {
    return this.customerService.updateCustomer(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCustomer(@Param('id') id: string) {
    return this.customerService.deleteCustomer(id);
  }
}
