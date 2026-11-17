/**
 * Router principal de la API. Cada módulo registra sus propias rutas.
 * Para agregar un módulo nuevo: crear `modules/<nombre>/` y montarlo aquí.
 */
import { Router } from 'express';
import { seedDemoData } from '../db/seedData';
import budgetsRoutes from '../modules/budgets/budgets.routes';
import categoriesRoutes from '../modules/categories/categories.routes';
import debtsRoutes from '../modules/debts/debts.routes';
import essentialsRoutes from '../modules/essentials/essentials.routes';
import goalsRoutes from '../modules/goals/goals.routes';
import onboardingRoutes from '../modules/onboarding/onboarding.routes';
import reportsRoutes from '../modules/reports/reports.routes';
import summaryRoutes from '../modules/summary/summary.routes';
import transactionsRoutes from '../modules/transactions/transactions.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.ELECTRON_RUN === '1' ? 'desktop' : 'web',
    version: process.env.APP_VERSION ?? '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.post('/seed', (_req, res) => {
  seedDemoData(true);
  res.json({ status: 'ok', message: 'Datos de demostración cargados' });
});

router.use('/onboarding', onboardingRoutes);
router.use('/categories', categoriesRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/budgets', budgetsRoutes);
router.use('/essentials', essentialsRoutes);
router.use('/goals', goalsRoutes);
router.use('/debts', debtsRoutes);
router.use('/summary', summaryRoutes);
router.use('/reports', reportsRoutes);

export default router;
