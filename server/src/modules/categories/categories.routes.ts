import { Router } from 'express';
import { categoriesController } from './categories.controller';

/** /api/categories */
const router = Router();

router.get('/', categoriesController.list);
router.post('/', categoriesController.create);
router.put('/subcategories/:subId', categoriesController.updateSubcategory);
router.delete('/subcategories/:subId', categoriesController.removeSubcategory);
router.post('/:id/subcategories', categoriesController.addSubcategory);
router.put('/:id', categoriesController.update);
router.delete('/:id', categoriesController.remove);

export default router;
