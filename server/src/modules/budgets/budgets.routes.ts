import { Router } from 'express';
import { budgetsController } from './budgets.controller';

/** /api/budgets */
const router = Router();

router.get('/', budgetsController.list); // ?month=YYYY-MM
router.post('/', budgetsController.upsert);
router.post('/copy', budgetsController.copy);
router.put('/:id', budgetsController.update);
router.delete('/:id', budgetsController.remove);

export default router;
