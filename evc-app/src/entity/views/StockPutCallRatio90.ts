import { ViewEntity, Connection, ViewColumn } from 'typeorm';
import { StockDailyPutCallRatio } from '../StockDailyPutCallRatio';


@ViewEntity({
  materialized: false,
  expression: (connection: Connection) => connection
    .createQueryBuilder()
    .from(StockDailyPutCallRatio, 'd')
    .leftJoin(q => q
      .from(q => q
        .from(q => q.from(StockDailyPutCallRatio, 'p')
          .innerJoin(q => q
            .from(StockDailyPutCallRatio, 'x'), 'x', 'x.symbol = p.symbol')
          .where('x.date <= p.date')
          .select([
            'p.symbol as symbol',
            'p.date as date',
            'x."putCallRatio"',
            'rank() over (partition by x.symbol, p.date order by x."putCallRatio" desc)'
          ]),
          'x')
        .select([
          'symbol',
          'date',
          'avg("putCallRatio") as "putCallRatioAvg90"',
        ])
        .where('rank <= 90')
        .groupBy('symbol, date')
        , 'x')
      , 'avg', 'd.symbol = avg.symbol AND d.date = avg.date')  
      .select([
        'd.symbol as symbol',
        'd.date as date',
        'd."putCallRatio" as "putCallRatio"',
        'avg."putCallRatioAvg90" as "putCallRatioAvg90"'
      ])
})
export class StockPutCallRatio90 {
  @ViewColumn()
  symbol: string;

  @ViewColumn()
  date: string;

  @ViewColumn()
  putCallRatio: number;

  @ViewColumn()
  putCallRatioAvg90: number;
}


