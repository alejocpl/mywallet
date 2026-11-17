import { asyncHandler } from '../../utils/asyncHandler';
import { parseId, parseMonthQuery } from '../../utils/validation';
import { checkPaymentSchema } from './essentials.schema';
import { essentialsService } from './essentials.service';

export const essentialsController = {
  list: asyncHandler((req, res) => {
    res.json(essentialsService.listByMonth(parseMonthQuery(req.query)));
  }),

  check: asyncHandler((req, res) => {
    const { amount } = checkPaymentSchema.parse(req.body ?? {});
    res.json(essentialsService.checkPayment(parseId(req.params.id), amount));
  }),
};
