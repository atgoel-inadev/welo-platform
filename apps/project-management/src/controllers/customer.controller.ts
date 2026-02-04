import { Controller, Get, Post, Body } from '@nestjs/common';
import { CustomerService } from '../services/customer.service';

export class CreateCustomerDto {
  name: string;
  email: string;
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
  async getCustomer(@Body('id') id: string) {
    return this.customerService.getCustomer(id);
  }

  @Post()
  async createCustomer(@Body() createDto: CreateCustomerDto) {
    return this.customerService.createCustomer(createDto);
  }
}
