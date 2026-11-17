import { Router } from 'express';
import { reportsController } from './reports.controller';

/** /api/reports */
const router = Router();

router.get('/pdf', reportsController.pdf); // ?month=YYYY-MM
router.get('/excel', reportsController.excel); // ?month=YYYY-MM

export default router;
