import { asyncHandler } from '../../utils/asyncHandler';
import { onboardingSchema } from './onboarding.schema';
import { onboardingService } from './onboarding.service';

export const onboardingController = {
  status: asyncHandler((_req, res) => {
    res.json(onboardingService.getStatus());
  }),

  submit: asyncHandler((req, res) => {
    const data = onboardingSchema.parse(req.body);
    res.status(201).json(onboardingService.completeOnboarding(data));
  }),

  skip: asyncHandler((_req, res) => {
    res.json(onboardingService.skipOnboarding());
  }),

  reset: asyncHandler((_req, res) => {
    res.json(onboardingService.resetAllData());
  }),
};
