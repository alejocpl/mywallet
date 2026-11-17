/**
 * Controladores HTTP de categorías: validan la entrada y delegan en el servicio.
 */
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/validation';
import {
  categoryQuerySchema,
  categorySchema,
  subcategoryDeleteQuerySchema,
  subcategorySchema,
} from './categories.schema';
import { categoriesService } from './categories.service';

export const categoriesController = {
  list: asyncHandler((req, res) => {
    const { type } = categoryQuerySchema.parse(req.query);
    res.json(categoriesService.list(type));
  }),

  create: asyncHandler((req, res) => {
    const data = categorySchema.parse(req.body);
    res.status(201).json(categoriesService.create(data));
  }),

  update: asyncHandler((req, res) => {
    const data = categorySchema.parse(req.body);
    res.json(categoriesService.update(parseId(req.params.id), data));
  }),

  remove: asyncHandler((req, res) => {
    categoriesService.remove(parseId(req.params.id));
    res.status(204).end();
  }),

  addSubcategory: asyncHandler((req, res) => {
    const data = subcategorySchema.parse(req.body);
    res.status(201).json(categoriesService.addSubcategory(parseId(req.params.id), data));
  }),

  updateSubcategory: asyncHandler((req, res) => {
    const data = subcategorySchema.parse(req.body);
    res.json(categoriesService.updateSubcategory(parseId(req.params.subId), data));
  }),

  removeSubcategory: asyncHandler((req, res) => {
    const { month } = subcategoryDeleteQuerySchema.parse(req.query);
    res.json(categoriesService.removeSubcategory(parseId(req.params.subId), month));
  }),
};
