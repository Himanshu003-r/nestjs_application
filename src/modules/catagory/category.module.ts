import { Module } from '@nestjs/common';
import { CategoryService } from './service/category.service';
import { CategoryController } from './controllers/category.controller';

@Module({
  providers: [CategoryService],
  controllers: [CategoryController]
})
export class CatagoryModule {}
