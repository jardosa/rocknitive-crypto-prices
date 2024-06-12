import { Module } from '@nestjs/common';
import { PricesService } from './prices.service';
import { PricesController } from './prices.controller';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register(),
    HttpModule.register({
      baseURL: 'https://api.coingecko.com/api/v3/',
      headers: {
        'x-cg-pro-key': process.env.CG_API_KEY,
      },
    }),
  ],
  controllers: [PricesController],
  providers: [PricesService],
})
export class PricesModule {}
