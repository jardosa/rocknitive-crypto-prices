import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { PricesService } from './prices.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Controller('price')
export class PricesController {
  constructor(
    private readonly pricesService: PricesService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.pricesService = pricesService;
  }
  @Get()
  async findAll() {
    return this.pricesService.findAll();
  }

  @Get('ping')
  ping() {
    return this.pricesService.ping();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('minutes') minutes = 60) {
    return this.pricesService.findOne(id, minutes);
  }
}
