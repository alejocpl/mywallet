import { Router } from 'express';
import { transactionsController } from './transactions.controller';

/** /api/transactions */
const router = Router();

router.get('/', transactionsController.list);
router.get('/:id', transactionsController.getById);
router.post('/', transactionsController.create);
router.put('/:id', transactionsController.update);
router.delete('/:id', transactionsController.remove);

export default router;
