import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/validation';
import { transactionFiltersSchema, transactionSchema } from './transactions.schema';
import { transactionsService } from './transactions.service';

export const transactionsController = {
  list: asyncHandler((req, res) => {
    const filters = transactionFiltersSchema.parse(req.query);
    res.json(transactionsService.list(filters));
  }),

  getById: asyncHandler((req, res) => {
    res.json(transactionsService.getById(parseId(req.params.id)));
  }),

  create: asyncHandler((req, res) => {
    const data = transactionSchema.parse(req.body);
    res.status(201).json(transactionsService.create(data));
  }),

  update: asyncHandler((req, res) => {
    const data = transactionSchema.parse(req.body);
    res.json(transactionsService.update(parseId(req.params.id), data));
  }),

  remove: asyncHandler((req, res) => {
    transactionsService.remove(parseId(req.params.id));
    res.status(204).end();
  }),
};
