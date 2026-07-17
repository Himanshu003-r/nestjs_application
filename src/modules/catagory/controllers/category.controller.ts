import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from '../service/category.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorator/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateCategoryDto } from '../dto/create.category.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly catagoryService: CategoryService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.catagoryService.createCategory(createCategoryDto);
  }

  @Get()
  getAll() {
    return this.catagoryService.getCategory();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.catagoryService.getSingleCategory(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.catagoryService.updateCategory(id, createCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.catagoryService.deleteCategory(id);
  }
}
