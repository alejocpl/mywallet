import { asyncHandler } from '../../utils/asyncHandler';
import { parseId, parseMonthQuery } from '../../utils/validation';
import { budgetCopySchema, budgetSchema, budgetUpdateSchema } from './budgets.schema';
import { budgetsService } from './budgets.service';

export const budgetsController = {
  list: asyncHandler((req, res) => {
    res.json(budgetsService.listByMonth(parseMonthQuery(req.query)));
  }),

  upsert: asyncHandler((req, res) => {
    const data = budgetSchema.parse(req.body);
    res.status(201).json(budgetsService.upsert(data));
  }),

  update: asyncHandler((req, res) => {
    const { amount } = budgetUpdateSchema.parse(req.body);
    res.json(budgetsService.updateAmount(parseId(req.params.id), amount));
  }),

  remove: asyncHandler((req, res) => {
    budgetsService.remove(parseId(req.params.id));
    res.status(204).end();
  }),

  copy: asyncHandler((req, res) => {
    const { toMonth, fromMonth } = budgetCopySchema.parse(req.body);
    res.json(budgetsService.copy(toMonth, fromMonth));
  }),
};
