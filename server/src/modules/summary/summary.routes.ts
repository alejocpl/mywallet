import { Router } from 'express';
import { summaryController } from './summary.controller';

/** /api/summary */
const router = Router();

router.get('/', summaryController.month); // ?month=YYYY-MM
router.get('/trend', summaryController.trend); // ?month=YYYY-MM&months=6
router.get('/comparison', summaryController.comparison); // ?month=YYYY-MM

export default router;
