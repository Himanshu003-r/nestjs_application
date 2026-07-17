import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from '../dto/create.category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prismaService: PrismaService) {}

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const { name } = createCategoryDto;

    const category = await this.prismaService.category.findUnique({
      where: { name },
    });

    if (category) {
      throw new ConflictException('Category already exists');
    }

    const newCategory = await this.prismaService.category.create({
      data: createCategoryDto,
    });

    return {
      data: newCategory,
      message: 'Category added successfully',
    };
  }

  async getCategory() {
    const category = await this.prismaService.category.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: category,
    };
  }

  async getSingleCategory(id:string){
    const category = await this.prismaService.category.findFirst({
      where:{id},
      include:{products:true}
    })

    if(!category || !category.isActive){
      throw new NotFoundException('Category with this id does not exist')
    }

    return{
      data: category
    }
  }

  async updateCategory(id: string, createCategoryDto: CreateCategoryDto) {
    const { name } = createCategoryDto;
    const category = await this.prismaService.category.findUnique({
      where: { id },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Category with id does not exist');
    }

    const categoryName = await this.prismaService.category.findUnique({
      where: { name },
    });

    // if the category name is same as existing name and the id of category is different then throw conflict
    if (categoryName?.id !== id && categoryName) {
      throw new ConflictException('Category already exists');
    }

    const updatedCategory = await this.prismaService.category.update({
      where: { id },
      data: { name },
    });

    return {
      data: updatedCategory,
      message: 'Category updated successfully',
    };
  }

  async deleteCategory(id: string) {
    const category = await this.prismaService.category.findFirst({
      where: { id, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Category with id does not exist');
    }

    const activeProductsCount = await this.prismaService.product.count({
        where:{categoryId: id,
            isActive: true}
    })

    if(activeProductsCount > 0){
        throw new ConflictException('Cannot delete category while it contains active products')
    }

    await this.prismaService.category.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      message: 'Category deleted successfully',
    };
  }
}
