import { RegisterHandlers } from 'ts-typed-api';
import app, { authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import { CommonApiDefinition } from '../definitions/common';
import { onboardingService } from '../../services/onboarding-service';

RegisterHandlers(app, CommonApiDefinition, {
    common: {
        getOnboardingStatus: async (req, res) => {
            const result = await onboardingService.getOnboardingStatus();

            if (!result.success) {
                return res.respond(500, {
                    error: 'Internal Server Error',
                    message: result.error
                });
            }

            res.respond(200, result.data);
        }
    }
}, [loggingMiddleware, timingMiddleware, authMiddleware]);
