import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Public()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('foods')
  @ApiOperation({ summary: 'Get all available foods' })
  async getFoods() {
    const data = await this.catalogService.getFoods();
    return { success: true, data };
  }

  @Get('exercises')
  @ApiOperation({ summary: 'Get all exercise categories with their exercises' })
  async getExercises() {
    const data = await this.catalogService.getExercises();
    return { success: true, data };
  }
}
