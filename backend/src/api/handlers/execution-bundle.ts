import { RegisterHandlers } from 'ts-typed-api';
import { executionBundleModel } from '../../models/execution-bundle';
import { loggingMiddleware, timingMiddleware } from '../../app';
import app from '../../app';
import { ExecutionBundleApiDefinition, ExecutionBundleResponse } from '../definitions/execution-bundle';

RegisterHandlers(app, ExecutionBundleApiDefinition, {
    executionBundles: {
        list: async (req, res) => {
            try {
                const { test_group_id, prompt_id } = req.query;

                const bundles = await executionBundleModel.findMany({
                    where: { test_group_id, prompt_id },
                    orderBy: 'created_at',
                    orderDirection: 'DESC'
                });

                const response: ExecutionBundleResponse[] = bundles.map(bundle => ({
                    id: bundle.id!,
                    test_group_id: bundle.test_group_id,
                    execution_ids: bundle.execution_ids,
                    created_at: bundle.created_at!.toISOString(),
                    updated_at: bundle.updated_at!.toISOString()
                }));

                res.respond(200, response);
            } catch (error) {
                console.error('Error listing execution bundles:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to list execution bundles'
                });
            }
        }
    }
}, [loggingMiddleware, timingMiddleware]);
