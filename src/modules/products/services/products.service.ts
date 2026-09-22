import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ProductQueryDto } from '../dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProduct(createProductDto: CreateProductDto) {
    const { name, description, price, stock, imageUrl, categoryId } =
      createProductDto;

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category does not exist');
    }

    if (!category.isActive) {
      throw new BadRequestException(
        'Category is inactive. Please choose an active category.',
      );
    }

    const product = await this.prisma.product.create({
      data: {
        name,
        description,
        price,
        stock,
        imageUrl,
        categoryId,
      },
      include: { category: true },
    });

    return {
      data: product,
      message: 'Product created successfully',
    };
  }

  async getAllProduct(productQueryDto: ProductQueryDto) {
    const { maxPrice, minPrice, categoryId, search, page, limit } =
      productQueryDto;
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      
      ...(categoryId && {
        categoryId,
      }),

      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }),

      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

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
