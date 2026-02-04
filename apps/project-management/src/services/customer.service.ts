import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '@app/common/entities';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  /**
   * List all customers
   */
  async listCustomers(): Promise<Customer[]> {
    return this.customerRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Get a single customer by ID
   */
  async getCustomer(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  /**
   * Create a new customer
   */
  async createCustomer(data: {
    name: string;
    email: string;
    subscription?: string;
  }): Promise<Customer> {
    const customer = this.customerRepository.create({
      name: data.name,
      email: data.email,
      subscriptionTier: data.subscription || 'FREE',
    });

    return await this.customerRepository.save(customer);
  }
}
