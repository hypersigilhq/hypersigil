<template>
    <div class="h-full flex flex-col">
        <div class="mb-6">
            <h1 class="text-3xl font-bold">Dashboard</h1>
            <p class="text-muted-foreground mt-2">
                Monitor token usage across models and providers.
            </p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span class="ml-2 text-muted-foreground">Loading dashboard data...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-12">
            <p class="text-destructive mb-4">{{ error }}</p>
            <Button @click="loadDashboardData" variant="outline">
                <RefreshCw class="h-4 w-4 mr-2" />
                Retry
            </Button>
        </div>

        <!-- Dashboard Content -->
        <div v-else>
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
                        <ChartjsBarChart :data="dailyChartData" height="300px" :format-value="formatNumber" />
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
                        <ChartjsBarChart :data="hourlyChartData" height="300px" :format-value="formatNumber" />
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
                    <ChartjsBarChart :data="providerModelChartData" height="400px" :format-value="formatNumber" />
                </CardContent>
            </Card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ChartjsBarChart from '@/components/ui/chartjs-bar-chart.vue'
import { Activity, Play, Server, Bot, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { dashboardApi } from '@/services/api-client'

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

interface ProviderModelData {
    provider: string
    model: string
    totalTokens: number
    inputTokens: number
    outputTokens: number
    executionCount: number
}

// Reactive state
const loading = ref(false)
const error = ref<string | null>(null)
const stats = ref<DashboardStats>({
    totalTokensUsed: 0,
    totalExecutions: 0,
    activeProviders: 0,
    activeModels: 0
})

const dailyData = ref<TokenUsageData[]>([])
const hourlyData = ref<TokenUsageData[]>([])
const providerModelData = ref<ProviderModelData[]>([])

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

// API data loading functions
const loadDashboardData = async () => {
    loading.value = true
    error.value = null

    try {
        // Load all dashboard data in parallel
        const [statsResponse, dailyResponse, hourlyResponse, providerModelResponse] = await Promise.all([
            dashboardApi.getStats(),
            dashboardApi.getDailyTokenUsage(),
            dashboardApi.getHourlyTokenUsage(),
            dashboardApi.getTokenUsageByProviderModel()
        ])

        // Update reactive state
        stats.value = statsResponse
        dailyData.value = dailyResponse
        hourlyData.value = hourlyResponse
        providerModelData.value = providerModelResponse

    } catch (err) {
        console.error('Error loading dashboard data:', err)
        error.value = err instanceof Error ? err.message : 'Failed to load dashboard data'
    } finally {
        loading.value = false
    }
}

// Load data on mount
onMounted(async () => {
    await loadDashboardData()
})
</script>
