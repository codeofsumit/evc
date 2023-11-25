import { Entity, PrimaryColumn, Index, Column, Generated } from 'typeorm';
import { ColumnNumericTransformer } from '../utils/ColumnNumericTransformer';

@Entity()
export class OptionPutCall {
  @PrimaryColumn()
  symbol: string;

  @PrimaryColumn('date')
  date: string;

  @Column()
  name: string;

  @Column()
  @Index()
  type: 'index' | 'etfs' | 'nasdaq';

  /**
   * P/C Vol
   */
  @Column('decimal', { transformer: new ColumnNumericTransformer() })
  putCallVolumeRatio: number;

  /**
   * Options Vol; Today Option Volume
   */
  @Column('decimal', { transformer: new ColumnNumericTransformer() })
  totalVolume: number;

  /**
   * P/C OI; Total P/C OI Ratio
   */
  @Column('decimal', { transformer: new ColumnNumericTransformer() })
  putCallOpenInterestRatio: number;

  /**
   * Total OI; Total Open Interest
   */
  @Column('decimal', { transformer: new ColumnNumericTransformer() })
  totalOpenInterest: number;

  @Column('jsonb')
  raw: object;
}
