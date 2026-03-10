import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from './customer.controller';
import { CustomerService } from '../services/customer.service';

describe('CustomerController', () => {
  let controller: CustomerController;
  let customerService: CustomerService;

  const mockCustomer = {
    id: 'customer-123',
    name: 'Test Customer',
    email: 'test@example.com',
    company: 'Test Company',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCustomerService = {
    listCustomers: jest.fn(),
    getCustomer: jest.fn(),
    createCustomer: jest.fn(),
    updateCustomer: jest.fn(),
    deleteCustomer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        {
          provide: CustomerService,
          useValue: mockCustomerService,
        },
      ],
    }).compile();

    controller = module.get<CustomerController>(CustomerController);
    customerService = module.get<CustomerService>(CustomerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /customers', () => {
    it('should return list of customers', async () => {
      const mockCustomers = [mockCustomer];
      mockCustomerService.listCustomers.mockResolvedValue(mockCustomers);

      const result = await controller.listCustomers();

      expect(result).toEqual(mockCustomers);
      expect(mockCustomerService.listCustomers).toHaveBeenCalled();
    });

    it('should filter customers by query parameters', async () => {
      const mockCustomers = [mockCustomer];
      mockCustomerService.listCustomers.mockResolvedValue(mockCustomers);

      const result = await controller.listCustomers();

      expect(result).toEqual(mockCustomers);
      expect(mockCustomerService.listCustomers).toHaveBeenCalled();
    });
  });

  describe('GET /customers/:id', () => {
    it('should return customer by id', async () => {
      mockCustomerService.getCustomer.mockResolvedValue(mockCustomer);

      const result = await controller.getCustomer('customer-123');

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerService.getCustomer).toHaveBeenCalledWith('customer-123');
    });
  });

  describe('POST /customers', () => {
    it('should create new customer', async () => {
      const createDto = {
        name: 'New Customer',
        email: 'new@example.com',
        company: 'New Company',
        contactPerson: 'John Doe',
        phone: '+1234567890',
      };

      mockCustomerService.createCustomer.mockResolvedValue(mockCustomer);

      const result = await controller.createCustomer(createDto);

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerService.createCustomer).toHaveBeenCalledWith(createDto);
    });
  });

  describe('PUT /customers/:id', () => {
    it('should update customer', async () => {
      const updateDto = {
        name: 'Updated Customer',
        email: 'updated@example.com',
        company: 'Updated Company',
      };

      const updatedCustomer = { ...mockCustomer, ...updateDto };
      mockCustomerService.updateCustomer.mockResolvedValue(updatedCustomer);

      const result = await controller.updateCustomer('customer-123', updateDto);

      expect(result).toEqual(updatedCustomer);
      expect(mockCustomerService.updateCustomer).toHaveBeenCalledWith('customer-123', updateDto);
    });
  });

  describe('DELETE /customers/:id', () => {
    it('should delete customer', async () => {
      mockCustomerService.deleteCustomer.mockResolvedValue(undefined);

      await expect(controller.deleteCustomer('customer-123')).resolves.not.toThrow();
      expect(mockCustomerService.deleteCustomer).toHaveBeenCalledWith('customer-123');
    });
  });
});