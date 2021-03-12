import { getManager, getRepository } from 'typeorm';
import { start } from './jobStarter';
import { Stock } from '../src/entity/Stock';
import { singleBatchRequest } from '../src/services/iexService';
import { StockDailyClose } from '../src/entity/StockDailyClose';
import { refreshMaterializedView } from '../src/db';
import { executeWithDataEvents } from '../src/services/dataLogService';
import * as _ from 'lodash';

async function syncManyStockClose(closeEntities: StockDailyClose[]) {
  if (closeEntities.length) {
    const chunks = _.chunk(closeEntities, 1000);
    let round = 0;
    for(const chunk of chunks) {
      round++;
      console.log(`Bulk inserting ${round}/${chunks.length} (1000 per run)`);
      await getManager()
        .createQueryBuilder()
        .insert()
        .into(StockDailyClose)
        .onConflict('("symbol", "date") DO NOTHING')
        .values(chunk)
        .execute();
    }
  }
}

async function udpateDatabase(iexBatchResponse) {
  const closeEntities: StockDailyClose[] = [];
  for (const [symbol, value] of Object.entries(iexBatchResponse)) {
    const { chart } = value as any;
    if (symbol && chart?.length) {
      for (const p of chart) {
        const stockClose = new StockDailyClose();
        stockClose.symbol = symbol;
        stockClose.date = p.date;
        stockClose.close = p.close;
        closeEntities.push(stockClose);
      }
    }
  }

  await syncManyStockClose(closeEntities);
}

async function syncIexToDatabase(symbols: string[]) {
  const types = ['chart'];
  const params = { range: '1y' };
  const resp = await singleBatchRequest(symbols, types, params);
  await udpateDatabase(resp);
}

const JOB_NAME = 'stock-historical-close-pe';

start(JOB_NAME, async () => {
  const stocks = await getRepository(Stock)
    .createQueryBuilder()
    .select('symbol')
    .getRawMany();
  const symbols = stocks.map(s => s.symbol);

  const batchSize = 100;
  let round = 0;
  const total = Math.ceil(symbols.length / batchSize);

  let batchSymbols = [];
  for (const symbol of symbols) {
    batchSymbols.push(symbol);
    if (batchSymbols.length === batchSize) {
      console.log(JOB_NAME, `${++round}/${total}`);
      await syncIexToDatabase(batchSymbols);
      batchSymbols = [];
    }
  }

  if (batchSymbols.length > 0) {
    console.log(JOB_NAME, `${++round}/${total}`);
    await syncIexToDatabase(batchSymbols);
  }

  await executeWithDataEvents('refresh materialized views', JOB_NAME, refreshMaterializedView);
});
