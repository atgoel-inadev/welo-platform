import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomerService } from './customer.service';
import { Customer } from '@app/common/entities';
import { CustomerStatus } from '@app/common/enums';

describe('CustomerService', () => {
  let service: CustomerService;
  let customerRepository: Repository<Customer>;

  const mockCustomer = {
    id: 'customer-123',
    name: 'Test Customer',
    organization: 'Test Company',
    contactEmail: 'test@customer.com',
    contactPhone: '+1234567890',
    billingInfo: null,
    status: CustomerStatus.ACTIVE,
    projects: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    metadata: null,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    customerRepository = module.get<Repository<Customer>>(getRepositoryToken(Customer));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listCustomers', () => {
    it('should return all customers', async () => {
      const mockCustomers = [mockCustomer];
      jest.spyOn(customerRepository, 'find').mockResolvedValue(mockCustomers);

      const result = await service.listCustomers();

      expect(result).toEqual(mockCustomers);
      expect(customerRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no customers exist', async () => {
      jest.spyOn(customerRepository, 'find').mockResolvedValue([]);

      const result = await service.listCustomers();

      expect(result).toEqual([]);
    });
  });

  describe('getCustomer', () => {
    it('should return customer when found', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer);

      const result = await service.getCustomer('customer-123');

      expect(result).toEqual(mockCustomer);
      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'customer-123' },
      });
    });

    it('should throw error when customer not found', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getCustomer('non-existent')).rejects.toThrow('Customer not found');
    });
  });

  describe('createCustomer', () => {
    it('should create and return new customer', async () => {
      const createData = {
        name: 'New Customer',
        email: 'new@customer.com',
        company: 'New Company',
        contactPerson: 'Jane Doe',
        phone: '+0987654321',
        address: '456 New St',
      };

      const createdCustomer = { ...mockCustomer, ...createData };

      jest.spyOn(customerRepository, 'create').mockReturnValue(createdCustomer as any);
      jest.spyOn(customerRepository, 'save').mockResolvedValue(createdCustomer);

      const result = await service.createCustomer(createData);

      expect(result).toEqual(createdCustomer);
      expect(customerRepository.create).toHaveBeenCalledWith(createData);
    });

    it('should create customer with minimal data', async () => {
      const createData = {
        name: 'Minimal Customer',
        email: 'minimal@customer.com',
      };

      const createdCustomer = { ...mockCustomer, ...createData, company: undefined };

      jest.spyOn(customerRepository, 'create').mockReturnValue(createdCustomer as any);
      jest.spyOn(customerRepository, 'save').mockResolvedValue(createdCustomer);

      const result = await service.createCustomer(createData);

      expect(result.name).toBe('Minimal Customer');
      expect(result.email).toBe('minimal@customer.com');
    });
  });

  describe('updateCustomer', () => {
    it('should update and return customer', async () => {
      const updateData = {
        name: 'Updated Customer',
        company: 'Updated Company',
      };

      const updatedCustomer = { ...mockCustomer, ...updateData };

      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer);
      jest.spyOn(customerRepository, 'save').mockResolvedValue(updatedCustomer);

      const result = await service.updateCustomer('customer-123', updateData);

      expect(result).toEqual(updatedCustomer);
      expect(result.name).toBe('Updated Customer');
      expect(result.company).toBe('Updated Company');
    });

    it('should throw error when customer not found', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateCustomer('non-existent', { name: 'Test' })).rejects.toThrow('Customer not found');
    });

    it('should handle partial updates', async () => {
      const updateData = { phone: '+1111111111' };
      const updatedCustomer = { ...mockCustomer, ...updateData };

      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer);
      jest.spyOn(customerRepository, 'save').mockResolvedValue(updatedCustomer);

      const result = await service.updateCustomer('customer-123', updateData);

      expect(result.phone).toBe('+1111111111');
      expect(result.name).toBe(mockCustomer.name); // unchanged
    });
  });

  describe('deleteCustomer', () => {
    it('should delete customer successfully', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer);
      jest.spyOn(customerRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      await expect(service.deleteCustomer('customer-123')).resolves.toBeUndefined();
      expect(customerRepository.delete).toHaveBeenCalledWith('customer-123');
    });

    it('should throw error when customer not found', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deleteCustomer('non-existent')).rejects.toThrow('Customer not found');
    });
  });
});