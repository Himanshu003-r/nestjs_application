import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProduct(createProductDto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: createProductDto,
    });

    return {
      data: product,
      message: 'Product created successfully',
    };
  }

  async getAllProduct(paginationQueryDto: PaginationQueryDto) {
    const { page, limit } = paginationQueryDto;
    const skip = (page - 1) * limit;

    const [total, products] = await Promise.all([
      this.prisma.product.count({
        where: {
          isActive: true,
        },
      }),
      this.prisma.product.findMany({
        where: { isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit)
    
    return {
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
      message: 'Products retrieved successfully',
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('No product found');
    }

    return {
      data: product,
      message: 'Product retrieved successfully',
    };
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });

    return {
      data: updatedProduct,
      message: 'Product updated successfully',
    };
  }

  async removeProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return {
      message: 'Product deleted successfully',
    };
  }
}
