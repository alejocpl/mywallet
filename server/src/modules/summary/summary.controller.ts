import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseMonthQuery } from '../../utils/validation';
import { summaryService } from './summary.service';

const trendQuerySchema = z.object({
  months: z.coerce.number().int().min(2).max(24).optional(),
});

export const summaryController = {
  month: asyncHandler((req, res) => {
    res.json(summaryService.getMonth(parseMonthQuery(req.query)));
  }),

  trend: asyncHandler((req, res) => {
    const { months } = trendQuerySchema.parse(req.query);
    res.json(summaryService.getTrend(parseMonthQuery(req.query), months));
  }),

  comparison: asyncHandler((req, res) => {
    res.json(summaryService.getComparison(parseMonthQuery(req.query)));
  }),
};
