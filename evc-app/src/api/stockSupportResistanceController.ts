import { getRepository } from 'typeorm';
import { assert, assertRole } from '../utils/assert';
import { handlerWrapper } from '../utils/asyncHandler';
import { compareTrend } from '../utils/compareTrend';
import { normalizeLoHiValues } from '../utils/normalizeLoHiValues';
import { StockSupport } from '../entity/StockSupport';
import { StockResistance } from '../entity/StockResistance';

function factoryListHandler(EntityType) {
  return handlerWrapper(async (req, res) => {
    assertRole(req, 'admin', 'agent');
    const { symbol } = req.params;
    const limit = +req.query.limit || 100;

    const list = await getRepository(EntityType).find({
      where: {
        symbol
      },
      order: {
        createdAt: 'DESC'
      },
      take: limit
    });

    res.json(list);
  });
}

function facatorySaveHandler(EntityType) {
  return handlerWrapper(async (req, res) => {
    assertRole(req, 'admin', 'agent');
    const { symbol } = req.params;
    const { user: { id: userId } } = req as any;
    const { lo, hi } = normalizeLoHiValues(req.body);

    const repo = getRepository(EntityType);
    const entity = new EntityType();
    entity.symbol = symbol;
    entity.author = userId;
    entity.lo = lo;
    entity.hi = hi;

    await repo.insert(entity);

    res.json();
  });
}

export const listStockSupport = factoryListHandler(StockSupport);

export const saveStockSupport = facatorySaveHandler(StockSupport);

export const deleteStockSupport = handlerWrapper(async (req, res) => {
  assertRole(req, 'admin', 'agent');
  const { id } = req.params;
  await getRepository(StockSupport).softDelete(id);
  res.json();
});

export const listStockResistance = factoryListHandler(StockResistance);

export const saveStockResistance = facatorySaveHandler(StockResistance);

export const deleteStockResistance = handlerWrapper(async (req, res) => {
  assertRole(req, 'admin', 'agent');
  const { id } = req.params;
  await getRepository(StockResistance).softDelete(id);
  res.json();
});

