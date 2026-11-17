import { Router } from 'express';
import { onboardingController } from './onboarding.controller';

/** /api/onboarding */
const router = Router();

router.get('/status', onboardingController.status);
router.post('/', onboardingController.submit);
router.post('/skip', onboardingController.skip);
router.post('/reset', onboardingController.reset);

export default router;
