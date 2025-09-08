import { executionModel } from '../../models/execution';
import { DashboardApiDefinition } from '../definitions/dashboard';
import { RegisterHandlers } from 'ts-typed-api';
import app, { authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';


RegisterHandlers(app, DashboardApiDefinition, {
    dashboard: {
        getStats: async (req, res) => {
            try {
                const { startDate, endDate } = req.query;

                const stats = await executionModel.getDashboardStats(startDate, endDate);
                res.json(Ok(stats));
            } catch (error) {
                console.error('Error getting dashboard stats:', error);
                res.status(500).json(Err('Failed to get dashboard statistics'));
            }
        },
        getTokenUsageByProviderModel: async (req, res) => {
            try {
                const { startDate, endDate } = req.query;

                const result = await executionModel.getTokenUsageByProviderModel(startDate, endDate);
                res.json(Ok(result));
            } catch (error) {
                console.error('Error getting token usage summary:', error);
                res.status(500).json(Err('Failed to get token usage summary'));
            }
        },
        getDailyTokenUsage: async (req, res) => {
            try {
                const { startDate, endDate, days } = req.query;
                const daysNum = days || 30;

                const result = await executionModel.getDailyTokenUsage(daysNum, startDate, endDate);
                res.json(Ok(result));
            } catch (error) {
                console.error('Error getting daily token usage:', error);
                res.status(500).json(Err('Failed to get daily token usage'));
            }
        },
        getHourlyTokenUsage: async (req, res) => {
            try {
                const { startDate, endDate, hours } = req.query;
                const hoursNum = hours || 24;

                const result = await executionModel.getHourlyTokenUsage(hoursNum, startDate, endDate);
                res.json(Ok(result));
            } catch (error) {
                console.error('Error getting hourly token usage:', error);
                res.status(500).json(Err('Failed to get hourly token usage'));
            }
        },
        getDailyTokenUsageByProviderModel: async (req, res) => {
            try {
                const { startDate, endDate, days } = req.query;
                const daysNum = days || 30;

                const result = await executionModel.getDailyTokenUsageByProviderModel(daysNum, startDate, endDate);
                res.json(Ok(result));
            } catch (error) {
                console.error('Error getting daily token usage by provider model:', error);
                res.status(500).json(Err('Failed to get daily token usage by provider model'));
            }
        },
        getHourlyTokenUsageByProviderModel: async (req, res) => {
            try {
                const { startDate, endDate, hours } = req.query;
                const hoursNum = hours || 24;

                const result = await executionModel.getHourlyTokenUsageByProviderModel(hoursNum, startDate, endDate);
                res.json(Ok(result));
            } catch (error) {
                console.error('Error getting hourly token usage by provider model:', error);
                res.status(500).json(Err('Failed to get hourly token usage by provider model'));
            }
        }
    }
}, [loggingMiddleware, timingMiddleware, authMiddleware]);
