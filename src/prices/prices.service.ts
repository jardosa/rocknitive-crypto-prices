import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import * as dayjs from 'dayjs';
import { Cron } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

type Response = {
  latest: number;
  average: number;
  history: [string, number][];
  count: number;
};

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.httpService = httpService;
  }

  @Cron('*/1 * * * *')
  async refreshPrices() {
    const { data } = await firstValueFrom(
      this.httpService.get('http://localhost:3000/price').pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw 'An error happened!';
        }),
      ),
    );

    await this.cacheManager.set(
      'bitcoin-ethereum-dogecoin-prices',
      data,
      55000,
    );

    this.logger.log('refreshed prices cache');
  }

  async ping(): Promise<Record<string, string>> {
    const response = await firstValueFrom(
      this.httpService.get('ping').pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw 'An error happened!';
        }),
      ),
    );

    return response.data;
  }

  async findAll() {
    const response = await firstValueFrom(
      this.httpService
        .get('simple/price', {
          params: {
            ids: 'bitcoin,ethereum,dogecoin',
            vs_currencies: 'usd',
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw 'An error happened!';
          }),
        ),
    );

    return response.data;
  }

  transformData(data: {
    prices: [number, number][];
    market_caps: [number, number][];
    total_volumes: [number, number][];
  }): {
    latest: number;
    average: number;
    history: [string, number][];
    count: number;
  } {
    const latest = data.prices.at(-1).at(1);
    const average =
      data.prices.reduce((acc, [, price]) => {
        return acc + price;
      }, 0) / data.prices.length;
    const history: [string, number][] = data.prices.map(([unixTime, price]) => {
      const unixTimeISO = dayjs(unixTime).toISOString();
      return [unixTimeISO, price];
    });
    const count: number = data.prices.length;

    return {
      latest,
      average,
      history,
      count,
    };
  }

  async findOne(id: string, minutes?: number): Promise<Response> {
    const currentUnixTime = dayjs().unix();
    const previousUnixTime = dayjs().subtract(minutes, 'minutes').unix();
    const response = await firstValueFrom(
      this.httpService
        .get(`coins/${id}/market_chart/range`, {
          params: {
            from: previousUnixTime,
            to: currentUnixTime,
            vs_currency: 'usd',
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw 'An error happened!';
          }),
        ),
    );

    return this.transformData(response.data);
  }
}
