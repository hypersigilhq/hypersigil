<template>
    <div class="h-full flex flex-col">
        <div class="mb-6">
            <h1 class="text-3xl font-bold">Dashboard</h1>
            <p class="text-muted-foreground mt-2">
                Monitor token usage across models and providers.
            </p>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-sm font-medium">Total Tokens</CardTitle>
                    <Activity class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold">
                        {{ formatNumber(stats.totalTokensUsed) }}
                    </div>
                    <p class="text-xs text-muted-foreground">
                        Across all executions
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-sm font-medium">Total Executions</CardTitle>
                    <Play class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold">
                        {{ formatNumber(stats.totalExecutions) }}
                    </div>
                    <p class="text-xs text-muted-foreground">
                        Completed requests
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-sm font-medium">Active Providers</CardTitle>
                    <Server class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold">
                        {{ stats.activeProviders }}
                    </div>
                    <p class="text-xs text-muted-foreground">
                        AI providers used
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-sm font-medium">Active Models</CardTitle>
                    <Bot class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold">
                        {{ stats.activeModels }}
                    </div>
                    <p class="text-xs text-muted-foreground">
                        Different models used
                    </p>
                </CardContent>
            </Card>
        </div>

        <!-- Top Provider/Model Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card v-if="stats.topProvider">
                <CardHeader>
                    <CardTitle class="text-sm font-medium">Top Provider</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold">{{ stats.topProvider.name }}</div>
                    <p class="text-xs text-muted-foreground">
                        {{ formatNumber(stats.topProvider.tokens) }} tokens
                        ({{ stats.topProvider.percentage.toFixed(1) }}%)
                    </p>
                </CardContent>
            </Card>

            <Card v-if="stats.topModel">
                <CardHeader>
                    <CardTitle class="text-sm font-medium">Top Model</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold">{{ stats.topModel.name }}</div>
                    <p class="text-xs text-muted-foreground">
                        {{ formatNumber(stats.topModel.tokens) }} tokens
                        ({{ stats.topModel.percentage.toFixed(1) }}%)
                    </p>
                </CardContent>
            </Card>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Daily Token Usage Chart -->
            <Card>
                <CardHeader>
                    <CardTitle>Daily Token Usage</CardTitle>
                    <CardDescription>
                        Token consumption over the last 30 days
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <BarChart :data="dailyChartData" height="300px" :format-value="formatNumber" />
                </CardContent>
            </Card>

            <!-- Hourly Token Usage Chart -->
            <Card>
                <CardHeader>
                    <CardTitle>Hourly Token Usage</CardTitle>
                    <CardDescription>
                        Token consumption over the last 24 hours
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <BarChart :data="hourlyChartData" height="300px" :format-value="formatNumber" />
                </CardContent>
            </Card>
        </div>

        <!-- Provider/Model Breakdown -->
        <Card class="mt-6">
            <CardHeader>
                <CardTitle>Token Usage by Provider & Model</CardTitle>
                <CardDescription>
                    Breakdown of token consumption across different providers and models
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div class="space-y-4">
                    <BarChart :data="providerModelChartData" height="400px" :format-value="formatNumber" />
                </div>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import BarChart from '@/components/ui/bar-chart.vue'
import { Activity, Play, Server, Bot } from 'lucide-vue-next'

// API client would need to be created
// import { dashboardApi } from '@/services/api/dashboard'

type TokenUsageSummaryResponse = {
    provider: string
    model: string
    totalTokens: number
    inputTokens: number
    outputTokens: number
    executionCount: number
}[]

interface DashboardStats {
    totalTokensUsed: number
    totalExecutions: number
    activeProviders: number
    activeModels: number
    topProvider?: {
        name: string
        tokens: number
        percentage: number
    }
    topModel?: {
        name: string
        tokens: number
        percentage: number
    }
}

interface TokenUsageData {
    date?: string
    hour?: number
    provider?: string
    model?: string
    totalTokens: number
    inputTokens: number
    outputTokens: number
    executionCount: number
}

// Mock data for now - replace with actual API calls
const stats = ref<DashboardStats>({
    totalTokensUsed: 125000,
    totalExecutions: 2500,
    activeProviders: 3,
    activeModels: 8,
    topProvider: {
        name: 'OpenAI',
        tokens: 75000,
        percentage: 60
    },
    topModel: {
        name: 'gpt-4',
        tokens: 45000,
        percentage: 36
    }
})

const dailyData = ref<TokenUsageData[]>([
    { date: '2025-01-01', totalTokens: 5200, inputTokens: 3200, outputTokens: 2000, executionCount: 45 },
    { date: '2025-01-02', totalTokens: 4800, inputTokens: 2900, outputTokens: 1900, executionCount: 42 },
    { date: '2025-01-03', totalTokens: 6100, inputTokens: 3800, outputTokens: 2300, executionCount: 52 },
    { date: '2025-01-04', totalTokens: 5500, inputTokens: 3400, outputTokens: 2100, executionCount: 48 },
    { date: '2025-01-05', totalTokens: 6700, inputTokens: 4100, outputTokens: 2600, executionCount: 58 },
    { date: '2025-01-06', totalTokens: 5900, inputTokens: 3600, outputTokens: 2300, executionCount: 51 },
    { date: '2025-01-07', totalTokens: 6300, inputTokens: 3900, outputTokens: 2400, executionCount: 55 }
])

const hourlyData = ref<TokenUsageData[]>([
    { hour: 0, totalTokens: 1200, inputTokens: 800, outputTokens: 400, executionCount: 12 },
    { hour: 1, totalTokens: 900, inputTokens: 600, outputTokens: 300, executionCount: 9 },
    { hour: 2, totalTokens: 700, inputTokens: 450, outputTokens: 250, executionCount: 7 },
    { hour: 3, totalTokens: 600, inputTokens: 400, outputTokens: 200, executionCount: 6 },
    { hour: 4, totalTokens: 800, inputTokens: 550, outputTokens: 250, executionCount: 8 },
    { hour: 5, totalTokens: 1100, inputTokens: 700, outputTokens: 400, executionCount: 11 },
    { hour: 6, totalTokens: 1500, inputTokens: 950, outputTokens: 550, executionCount: 15 },
    { hour: 7, totalTokens: 1800, inputTokens: 1100, outputTokens: 700, executionCount: 18 },
    { hour: 8, totalTokens: 2200, inputTokens: 1400, outputTokens: 800, executionCount: 22 },
    { hour: 9, totalTokens: 2500, inputTokens: 1600, outputTokens: 900, executionCount: 25 },
    { hour: 10, totalTokens: 2800, inputTokens: 1800, outputTokens: 1000, executionCount: 28 },
    { hour: 11, totalTokens: 2600, inputTokens: 1700, outputTokens: 900, executionCount: 26 },
    { hour: 12, totalTokens: 2400, inputTokens: 1500, outputTokens: 900, executionCount: 24 },
    { hour: 13, totalTokens: 2300, inputTokens: 1400, outputTokens: 900, executionCount: 23 },
    { hour: 14, totalTokens: 2700, inputTokens: 1700, outputTokens: 1000, executionCount: 27 },
    { hour: 15, totalTokens: 2900, inputTokens: 1800, outputTokens: 1100, executionCount: 29 },
    { hour: 16, totalTokens: 3100, inputTokens: 1900, outputTokens: 1200, executionCount: 31 },
    { hour: 17, totalTokens: 2800, inputTokens: 1700, outputTokens: 1100, executionCount: 28 },
    { hour: 18, totalTokens: 2500, inputTokens: 1500, outputTokens: 1000, executionCount: 25 },
    { hour: 19, totalTokens: 2200, inputTokens: 1300, outputTokens: 900, executionCount: 22 },
    { hour: 20, totalTokens: 1900, inputTokens: 1100, outputTokens: 800, executionCount: 19 },
    { hour: 21, totalTokens: 1600, inputTokens: 900, outputTokens: 700, executionCount: 16 },
    { hour: 22, totalTokens: 1300, inputTokens: 700, outputTokens: 600, executionCount: 13 },
    { hour: 23, totalTokens: 1000, inputTokens: 600, outputTokens: 400, executionCount: 10 }
])

const providerModelData = ref<TokenUsageSummaryResponse>([
    { provider: 'OpenAI', model: 'gpt-4', totalTokens: 45000, inputTokens: 28000, outputTokens: 17000, executionCount: 180 },
    { provider: 'OpenAI', model: 'gpt-3.5-turbo', totalTokens: 30000, inputTokens: 19000, outputTokens: 11000, executionCount: 240 },
    { provider: 'Anthropic', model: 'claude-3-sonnet', totalTokens: 25000, inputTokens: 16000, outputTokens: 9000, executionCount: 120 },
    { provider: 'Anthropic', model: 'claude-3-haiku', totalTokens: 15000, inputTokens: 9500, outputTokens: 5500, executionCount: 150 },
    { provider: 'Ollama', model: 'qwen2.5:6b', totalTokens: 8000, inputTokens: 5000, outputTokens: 3000, executionCount: 200 },
    { provider: 'Gemini', model: 'gemini-pro', totalTokens: 5000, inputTokens: 3200, outputTokens: 1800, executionCount: 80 }
])

// Computed properties for chart data
const dailyChartData = computed(() => {
    return dailyData.value.map(item => ({
        label: item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        value: item.totalTokens
    }))
})

const hourlyChartData = computed(() => {
    return hourlyData.value.map(item => ({
        label: item.hour !== undefined ? `${item.hour}:00` : '',
        value: item.totalTokens
    }))
})

const providerModelChartData = computed(() => {
    return providerModelData.value.map(item => ({
        label: `${item.provider}/${item.model}`,
        value: item.totalTokens
    }))
})

// Utility functions
const formatNumber = (num: number): string => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K'
    }
    return num.toLocaleString()
}

// Load data on mount
onMounted(async () => {
    // TODO: Replace with actual API calls
    // await loadDashboardData()
})
</script>
