import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '@app/common/entities';
import { CustomerStatus } from '@app/common/enums';

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
      organization: data.name, // Default to name if organization not provided
      contactEmail: data.email,
      status: CustomerStatus.ACTIVE,
    });

    return await this.customerRepository.save(customer);
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(
    id: string,
    data: {
      name?: string;
      email?: string;
      subscription?: string;
    },
  ): Promise<Customer> {
    const customer = await this.getCustomer(id);

    if (data.name) customer.name = data.name;
    if (data.email) customer.contactEmail = data.email;
    // Note: subscription field doesn't exist in Customer entity, ignoring for now

    return await this.customerRepository.save(customer);
  }

  /**
   * Delete a customer (soft delete recommended in production)
   */
  async deleteCustomer(id: string): Promise<void> {
    const customer = await this.getCustomer(id);
    await this.customerRepository.remove(customer);
  }
}
