import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductsService } from './products.service';
import {jest,expect} from '@jest/globals'

describe('ProductsService', () => {
  let service: ProductsService;

  let prisma: {
    category: {
      findUnique: jest.Mock;
    };
    product: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findUnique: jest.fn(),
      },
      product: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('returns an active product', async () => {
      const product = {
        id: 'p1',
        name: 'Keyboard',
        isActive: true,
      };

      prisma.product.findFirst.mockResolvedValue(product);

      const result = await service.findOne('p1');

      expect(result.data).toEqual(product);
      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p1', isActive: true },
      });
    });

    it('throws NotFoundException when product is missing', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createProduct', () => {
    const dto = {
      name: 'Keyboard',
      description: 'Mechanical keyboard',
      price: 1000,
      stock: 10,
      imageUrl: 'https://example.com/keyboard.png',
      categoryId: 'c1',
    };

    it('creates a product for an active category', async () => {
      const category = { id: 'c1', isActive: true };
      const product = { id: 'p1', ...dto, category };

      prisma.category.findUnique.mockResolvedValue(category);
      prisma.product.create.mockResolvedValue(product);

      const result = await service.createProduct(dto as any);

      expect(result.data).toEqual(product);
      expect(result.message).toBe('Product created successfully');
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: dto,
        include: { category: true },
      });
    });

    it('throws NotFoundException when category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.createProduct(dto as any)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when category is inactive', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'c1',
        isActive: false,
      });

      await expect(service.createProduct(dto as any)).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllProduct', () => {
    it('returns products and pagination metadata', async () => {
      const products = [{ id: 'p1', name: 'Keyboard' }];

      prisma.product.count.mockResolvedValue(11);
      prisma.product.findMany.mockResolvedValue(products);

      const query = {
        page: 2,
        limit: 5,
      };

      const result = await service.getAllProduct(query as any);

      expect(result.data).toEqual(products);
      expect(result.meta).toEqual({
        page: 2,
        limit: 5,
        total: 11,
        totalPages: 3,
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('applies category, search and price filters', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.getAllProduct({
        page: 1,
        limit: 10,
        categoryId: 'c1',
        search: 'key',
        minPrice: 100,
        maxPrice: 500,
      } as any);

      expect(prisma.product.count).toHaveBeenCalledWith({
        where: {
          isActive: true,
          categoryId: 'c1',
          name: { contains: 'key', mode: 'insensitive' },
          price: { gte: 100, lte: 500 },
        },
      });
    });

    it('returns zero total pages when no products exist', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getAllProduct({
        page: 1,
        limit: 10,
      } as any);

      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('updateProduct', () => {
    it('updates an active product', async () => {
      const existing = { id: 'p1', isActive: true };
      const updated = { id: 'p1', name: 'New Keyboard' };

      prisma.product.findUnique.mockResolvedValue(existing);
      prisma.product.update.mockResolvedValue(updated);

      const result = await service.updateProduct('p1', {
        name: 'New Keyboard',
      } as any);

      expect(result.data).toEqual(updated);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { name: 'New Keyboard' },
      });
    });

    it('throws NotFoundException when product is missing', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.updateProduct('missing', {} as any)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when product is inactive', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        isActive: false,
      });

      await expect(service.updateProduct('p1', {} as any)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('removeProduct', () => {
    it('soft-deletes an active product', async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: 'p1',
        isActive: true,
      });
      prisma.product.update.mockResolvedValue({
        id: 'p1',
        isActive: false,
      });

      const result = await service.removeProduct('p1');

      expect(result.message).toBe('Product deleted successfully');
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { isActive: false },
      });
    });

    it('throws NotFoundException when product is missing', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.removeProduct('missing')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });
});
