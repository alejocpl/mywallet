import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/validation';
import { debtSchema, paymentSchema } from './debts.schema';
import { debtsService } from './debts.service';

export const debtsController = {
  list: asyncHandler((_req, res) => {
    res.json(debtsService.list());
  }),

  create: asyncHandler((req, res) => {
    res.status(201).json(debtsService.create(debtSchema.parse(req.body)));
  }),

  update: asyncHandler((req, res) => {
    res.json(debtsService.update(parseId(req.params.id), debtSchema.parse(req.body)));
  }),

  remove: asyncHandler((req, res) => {
    debtsService.remove(parseId(req.params.id));
    res.status(204).end();
  }),

  pay: asyncHandler((req, res) => {
    res.json(debtsService.pay(parseId(req.params.id), paymentSchema.parse(req.body)));
  }),
};
