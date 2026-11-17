import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/validation';
import { contributionSchema, goalSchema } from './goals.schema';
import { goalsService } from './goals.service';

export const goalsController = {
  list: asyncHandler((_req, res) => {
    res.json(goalsService.list());
  }),

  create: asyncHandler((req, res) => {
    res.status(201).json(goalsService.create(goalSchema.parse(req.body)));
  }),

  update: asyncHandler((req, res) => {
    res.json(goalsService.update(parseId(req.params.id), goalSchema.parse(req.body)));
  }),

  remove: asyncHandler((req, res) => {
    goalsService.remove(parseId(req.params.id));
    res.status(204).end();
  }),

  contribute: asyncHandler((req, res) => {
    res.json(goalsService.contribute(parseId(req.params.id), contributionSchema.parse(req.body)));
  }),

  contributions: asyncHandler((req, res) => {
    res.json(goalsService.contributions(parseId(req.params.id)));
  }),
};
