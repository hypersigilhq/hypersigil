import { Request, Response } from 'express';
import { executionModel } from '../../models/execution';
import { DashboardStatsSchema, TokenUsageSummarySchema, DailyTokenUsageSchema, HourlyTokenUsageSchema, DashboardApiDefinition } from '../definitions/dashboard';
import { RegisterHandlers } from 'ts-typed-api';
import app, { authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';

type DashboardStatsResponse = import('zod').infer<typeof DashboardStatsSchema>;
type TokenUsageSummaryResponse = import('zod').infer<typeof TokenUsageSummarySchema>[];
type DailyTokenUsageResponse = import('zod').infer<typeof DailyTokenUsageSchema>[];
type HourlyTokenUsageResponse = import('zod').infer<typeof HourlyTokenUsageSchema>[];


RegisterHandlers(app, DashboardApiDefinition, {
    dashboard: {
        getStats: async function getDashboardStats(
            req: Request,
            res: Response<Result<DashboardStatsResponse, string>>
        ): Promise<void> {
            try {
                const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

                const stats = await executionModel.getDashboardStats(startDate, endDate);
                res.json(Ok(stats));
            } catch (error) {
                console.error('Error getting dashboard stats:', error);
                res.status(500).json(Err('Failed to get dashboard statistics'));
            }
        },
        getTokenUsageByProviderModel: async function getTokenUsageByProviderModel(
            req: Request,
            res: Response<Result<TokenUsageSummaryResponse, string>>
        ): Promise<void> {
            try {
                const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

                const result = await executionModel.getTokenUsageByProviderModel(startDate, endDate);
                res.json(Ok(result));
            } catch (error) {
                console.error('Error getting token usage summary:', error);
                res.status(500).json(Err('Failed to get token usage summary'));
            }
        },
        getDailyTokenUsage: async function getDailyTokenUsage(
            req: Request,
            res: Response<Result<DailyTokenUsageResponse, string>>
        ): Promise<void> {
            try {
                const { startDate, endDate, days } = req.query as any;
                const daysNum = days ? parseInt(days as string) : 30;

                const result = await executionModel.getDailyTokenUsage(daysNum, startDate, endDate);
                res.json(Ok(result));
            } catch (error) {
                console.error('Error getting daily token usage:', error);
                res.status(500).json(Err('Failed to get daily token usage'));
            }
        },
        getHourlyTokenUsage: async function getHourlyTokenUsage(
            req: Request,
            res: Response<Result<HourlyTokenUsageResponse, string>>
        ): Promise<void> {
            try {
                const { startDate, endDate, hours } = req.query as any;
                const hoursNum = hours ? parseInt(hours as string) : 24;

                const result = await executionModel.getHourlyTokenUsage(hoursNum, startDate, endDate);
                res.json(Ok(result));
            } catch (error) {
                console.error('Error getting hourly token usage:', error);
                res.status(500).json(Err('Failed to get hourly token usage'));
            }
        }
    }
}, [loggingMiddleware, timingMiddleware, authMiddleware]);
