import { RegisterHandlers } from 'ts-typed-api';
import app, { apiKeyMiddleware, authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import { DeploymentEmbedding, deploymentEmbeddingModel } from '../../models/deployment-embedding';
import { Scheduler } from '../../workers/scheduler';
import { GenerateEmbeddingData } from '../../workers/workers/generate-embedding';
import { z } from 'zod';
import { DeploymentEmbeddingApiDefinition, DeploymentEmbeddingResponse } from '../definitions/deployment-embedding';

function formatDeploymentEmbeddingForResponse(deploymentEmbedding: DeploymentEmbedding): DeploymentEmbeddingResponse {
    return {
        id: deploymentEmbedding.id!,
        name: deploymentEmbedding.name,
        model: deploymentEmbedding.model,
        inputType: deploymentEmbedding.inputType,
        webhookDestinationIds: deploymentEmbedding.webhookDestinationIds,
        created_at: (deploymentEmbedding.created_at instanceof Date ? deploymentEmbedding.created_at.toISOString() : deploymentEmbedding.created_at)!,
        updated_at: (deploymentEmbedding.updated_at instanceof Date ? deploymentEmbedding.updated_at.toISOString() : deploymentEmbedding.updated_at)!
    };
}

RegisterHandlers(app, DeploymentEmbeddingApiDefinition, {
    deploymentEmbeddings: {
        list: async (req, res) => {
            const { page, limit, search, orderBy, orderDirection } = req.query;

            const result = await deploymentEmbeddingModel.findWithSearch({
                page: page || 1,
                limit: limit || 10,
                search,
                orderBy,
                orderDirection
            });

            const formattedResult = {
                ...result,
                data: result.data.map(formatDeploymentEmbeddingForResponse)
            };

            res.respond(200, formattedResult);
        },

        create: async (req, res) => {
            const { name, model, inputType, webhookDestinationIds } = req.body;

            const result = await deploymentEmbeddingModel.createWithValidation({
                name,
                model,
                inputType: inputType ?? null,
                webhookDestinationIds: webhookDestinationIds ?? [],
            });

            if (!result.success) {
                return res.respond(400, {
                    error: 'Validation Error',
                    message: result.error
                });
            }

            res.respond(201, formatDeploymentEmbeddingForResponse(result.data));
        },

        getById: async (req, res) => {
            const { id } = req.params;

            const deploymentEmbedding = await deploymentEmbeddingModel.findById(id);
            if (!deploymentEmbedding) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'Deployment embedding not found'
                });
            }

            res.respond(200, formatDeploymentEmbeddingForResponse(deploymentEmbedding));
        },

        getByName: async (req, res) => {
            const { name } = req.params;

            const deploymentEmbedding = await deploymentEmbeddingModel.findByName(name);
            if (!deploymentEmbedding) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'Deployment embedding not found'
                });
            }

            res.respond(200, formatDeploymentEmbeddingForResponse(deploymentEmbedding));
        },

        update: async (req, res) => {
            const { id } = req.params;
            const updateData = req.body;

            const existingDeploymentEmbedding = await deploymentEmbeddingModel.findById(id);
            if (!existingDeploymentEmbedding) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'Deployment embedding not found'
                });
            }

            const filteredUpdateData = Object.fromEntries(
                Object.entries(updateData).filter(([_, value]) => value !== undefined)
            );

            const result = await deploymentEmbeddingModel.updateWithValidation(id, filteredUpdateData);
            if (!result.success) {
                return res.respond(400, {
                    error: 'Validation Error',
                    message: result.error
                });
            }

            if (!result.data) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'Deployment embedding not found'
                });
            }

            res.respond(200, formatDeploymentEmbeddingForResponse(result.data));
        },

        delete: async (req, res) => {
            const { id } = req.params;

            const existingDeploymentEmbedding = await deploymentEmbeddingModel.findById(id);
            if (!existingDeploymentEmbedding) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'Deployment embedding not found'
                });
            }

            const deleted = await deploymentEmbeddingModel.delete(id);
            if (!deleted) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'Deployment embedding not found'
                });
            }

            res.respond(204, {});
        },

        run: async (req, res) => {
            const { name } = req.params;
            const { inputs } = req.body;

            const deploymentEmbedding = await deploymentEmbeddingModel.findByName(name);
            if (!deploymentEmbedding) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'Deployment embedding not found'
                });
            }

            // Prepare the embedding data
            const embeddingData: GenerateEmbeddingData = {
                inputs,
                model: deploymentEmbedding.model,
                ...(deploymentEmbedding.inputType !== null && { inputType: deploymentEmbedding.inputType }),
                ...(deploymentEmbedding.webhookDestinationIds !== null && { webhookDestinationIds: deploymentEmbedding.webhookDestinationIds }),
            };

            try {
                // Schedule the embedding generation job
                const jobId = await Scheduler.sendNow('generate-embedding', embeddingData);

                res.respond(201, { jobId });
            } catch (error) {
                console.error('Error scheduling embedding job:', error);
                return res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to schedule embedding job'
                });
            }
        }
    }
}, [loggingMiddleware, timingMiddleware, apiKeyMiddleware<typeof DeploymentEmbeddingApiDefinition>((scopes, endpointInfo) => {
    if (endpointInfo.domain !== 'deploymentEmbeddings') {
        return false;
    }
    switch (endpointInfo.routeKey) {
        case 'run':
            return scopes.includes('deployment-embeddings:run');
        default:
            return false;
    }
}), authMiddleware]);
