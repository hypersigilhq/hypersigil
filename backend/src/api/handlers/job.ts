import { RegisterHandlers } from 'ts-typed-api';
import { jobModel } from '../../workers/models/job';
import { authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import app from '../../app';
import { JobApiDefinition, JobResponse } from '../definitions/job';
import { JobDocument } from '../../workers/types';
import { Scheduler } from '../../workers';

RegisterHandlers(app, JobApiDefinition, {
    jobs: {
        trigger: async (req, res) => {
            switch (req.body.job.type) {
                case "webhook-delivery":
                    await Scheduler.sendWithRetryConfig("webhook-delivery", {
                        webhookId: "", // if empty, the url will be taken into account
                        url: req.body.job.data.url,
                        data: {
                            event: "test",
                            time: new Date()
                        }
                    }, { maxAttempts: 1 })
            }

            res.respond(201, {})
        },
        list: async (req, res) => {
            const { page = 1, limit = 50, status, jobName, search, orderBy = 'created_at', orderDirection = 'DESC' } = req.query;

            try {
                // Build filter conditions
                const filters: any = {};

                if (status) {
                    filters.status = status;
                }

                if (jobName) {
                    filters.type = jobName;
                }

                // Handle search by job ID - we'll need to do this manually since the base model doesn't support LIKE queries in where clauses
                let result;
                if (search) {
                    // For search, we'll use a custom approach
                    const allJobs = await jobModel.search('id', search);

                    // Apply additional filters manually
                    let filteredJobs = allJobs;
                    if (status) {
                        filteredJobs = filteredJobs.filter((job: JobDocument) => job.status === status);
                    }
                    if (jobName) {
                        filteredJobs = filteredJobs.filter((job: JobDocument) => job.type === jobName);
                    }

                    // Manual pagination
                    const total = filteredJobs.length;
                    const offset = (page - 1) * limit;
                    const paginatedJobs = filteredJobs.slice(offset, offset + limit);
                    const totalPages = Math.ceil(total / limit);

                    result = {
                        data: paginatedJobs,
                        total,
                        page,
                        limit,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    };
                } else {
                    // Use normal pagination when no search
                    const whereConditions = Object.keys(filters).length > 0 ? filters : undefined;
                    result = await jobModel.findWithPagination({
                        where: whereConditions,
                        page,
                        limit,
                        orderBy,
                        orderDirection
                    });
                }

                const response = {
                    ...result,
                    data: result.data.map((job: JobDocument) => ({
                        id: job.id!,
                        type: job.type,
                        data: job.data,
                        status: job.status,
                        result: job.result,
                        error: job.error,
                        terminationReason: job.terminationReason,
                        attempts: job.attempts,
                        maxAttempts: job.maxAttempts,
                        scheduledAt: job.scheduledAt.toISOString(),
                        nextRetryAt: job.nextRetryAt?.toISOString(),
                        startedAt: job.startedAt?.toISOString(),
                        completedAt: job.completedAt?.toISOString(),
                        retryDelayMs: job.retryDelayMs,
                        retryBackoffMultiplier: job.retryBackoffMultiplier,
                        maxRetryDelayMs: job.maxRetryDelayMs,
                        created_at: job.created_at!.toISOString(),
                        updated_at: job.updated_at!.toISOString()
                    } as JobResponse))
                };

                res.respond(200, response);
            } catch (error) {
                console.error('Error fetching jobs:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to fetch jobs'
                });
            }
        },

        getById: async (req, res) => {
            const { id } = req.params;

            try {
                const job = await jobModel.findById(id);

                if (!job) {
                    return res.respond(404, {
                        error: 'Job not found',
                        message: `Job with id ${id} not found`
                    });
                }

                const response: JobResponse = {
                    id: job.id!,
                    type: job.type,
                    data: job.data,
                    status: job.status,
                    result: job.result,
                    error: job.error,
                    terminationReason: job.terminationReason,
                    attempts: job.attempts,
                    maxAttempts: job.maxAttempts,
                    scheduledAt: job.scheduledAt.toISOString(),
                    nextRetryAt: job.nextRetryAt?.toISOString(),
                    startedAt: job.startedAt?.toISOString(),
                    completedAt: job.completedAt?.toISOString(),
                    retryDelayMs: job.retryDelayMs,
                    retryBackoffMultiplier: job.retryBackoffMultiplier,
                    maxRetryDelayMs: job.maxRetryDelayMs,
                    created_at: job.created_at!.toISOString(),
                    updated_at: job.updated_at!.toISOString()
                };

                res.respond(200, response);
            } catch (error) {
                console.error('Error fetching job:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to fetch job'
                });
            }
        }
    }
}, [loggingMiddleware, timingMiddleware, authMiddleware]);
