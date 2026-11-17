import { Router } from 'express';
import { debtsController } from './debts.controller';

/** /api/debts */
const router = Router();

router.get('/', debtsController.list);
router.post('/', debtsController.create);
router.put('/:id', debtsController.update);
router.delete('/:id', debtsController.remove);
router.post('/:id/payments', debtsController.pay);

export default router;
