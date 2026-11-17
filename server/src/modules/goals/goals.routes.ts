import { Router } from 'express';
import { goalsController } from './goals.controller';

/** /api/goals */
const router = Router();

router.get('/', goalsController.list);
router.post('/', goalsController.create);
router.put('/:id', goalsController.update);
router.delete('/:id', goalsController.remove);
router.get('/:id/contributions', goalsController.contributions);
router.post('/:id/contributions', goalsController.contribute);

export default router;
