import { Router } from 'express';
import { essentialsController } from './essentials.controller';

/** /api/essentials */
const router = Router();

router.get('/', essentialsController.list); // ?month=YYYY-MM
router.post('/payments/:id/check', essentialsController.check);

export default router;
