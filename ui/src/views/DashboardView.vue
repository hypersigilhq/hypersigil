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
            <!-- Date Range Picker -->
            <div class="mb-6">
                <DateRangePicker v-model="selectedDateRange" @update:model-value="onDateRangeChange" />
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
                <!-- Conditional Chart Display -->
                <Card v-if="!showHourlyChart">
                    <CardHeader>
                        <CardTitle>{{ chartTitle }}</CardTitle>
                        <CardDescription>
                            {{ chartDescription }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartjsBarChart :data="dailyChartData" height="300px" :format-value="formatNumber" />
                    </CardContent>
                </Card>

                <Card v-if="showHourlyChart">
                    <CardHeader>
                        <CardTitle>{{ chartTitle }}</CardTitle>
                        <CardDescription>
                            {{ chartDescription }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartjsBarChart :data="hourlyChartData" height="300px" :format-value="formatNumber" />
                    </CardContent>
                </Card>

                <!-- Provider/Model Breakdown -->
                <Card>
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
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ChartjsBarChart from '@/components/ui/chartjs-bar-chart.vue'
import DateRangePicker from '@/components/ui/date-range-picker.vue'
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

// Date range state
const selectedDateRange = ref<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
})

// Computed property to determine chart display mode
const showHourlyChart = computed(() => {
    const { start, end } = selectedDateRange.value
    if (!start || !end) return false

    // Show hourly chart if same day is selected
    return start.toDateString() === end.toDateString()
})

// Computed property for dynamic chart titles and descriptions
const chartTitle = computed(() => {
    return showHourlyChart.value ? 'Hourly Token Usage' : 'Daily Token Usage'
})

const chartDescription = computed(() => {
    if (showHourlyChart.value) {
        const date = selectedDateRange.value.start
        return date ? `Token consumption on ${date.toLocaleDateString('en-GB')}` : 'Token consumption for selected day'
    } else {
        return 'Token consumption over selected date range'
    }
})

// Computed properties for chart data
const dailyChartData = computed(() => {
    if (!selectedDateRange.value.start || !selectedDateRange.value.end) {
        return []
    }

    // Create array of all days in the selected range
    const days: { date: string; value: number }[] = []
    const currentDate = new Date(selectedDateRange.value.start)

    while (currentDate <= selectedDateRange.value.end) {
        const dateString = currentDate.toISOString().split('T')[0] // YYYY-MM-DD format
        days.push({
            date: dateString,
            value: 0 // Default to 0
        })
        currentDate.setDate(currentDate.getDate() + 1)
    }

    // Merge with actual data from API
    dailyData.value.forEach(item => {
        if (item.date) {
            const dayIndex = days.findIndex(day => day.date === item.date)
            if (dayIndex !== -1) {
                days[dayIndex].value = item.totalTokens
            }
        }
    })

    return days.map(day => ({
        label: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: day.value
    }))
})

const hourlyChartData = computed(() => {
    // Create array of all 24 hours
    const hours: { hour: number; value: number }[] = []
    for (let i = 0; i < 24; i++) {
        hours.push({
            hour: i,
            value: 0 // Default to 0
        })
    }

    // Merge with actual data from API
    hourlyData.value.forEach(item => {
        if (item.hour !== undefined && item.hour >= 0 && item.hour < 24) {
            hours[item.hour].value = item.totalTokens
        }
    })

    return hours.map(hour => ({
        label: `${hour.hour}:00`,
        value: hour.value
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
        // Prepare date range parameters
        let dateParams = {}
        if (selectedDateRange.value.start && selectedDateRange.value.end) {
            const startDate = selectedDateRange.value.start
            let endDate = selectedDateRange.value.end

            // If same day is selected, extend end date to end of day to include all executions
            if (startDate.toDateString() === endDate.toDateString()) {
                endDate = new Date(endDate)
                endDate.setHours(23, 59, 59, 999)
            }

            dateParams = {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            }
        }

        // Load all dashboard data in parallel with date filtering
        const [statsResponse, dailyResponse, hourlyResponse, providerModelResponse] = await Promise.all([
            dashboardApi.getStats(dateParams),
            dashboardApi.getDailyTokenUsage(dateParams),
            dashboardApi.getHourlyTokenUsage(dateParams),
            dashboardApi.getTokenUsageByProviderModel(dateParams)
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

// Date range change handler
const onDateRangeChange = async (dateRange: { start: Date | null; end: Date | null }) => {
    selectedDateRange.value = dateRange
    await loadDashboardData()
}

// Load data on mount
onMounted(async () => {
    // Set default date range to last 7 days
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 7)

    selectedDateRange.value = {
        start,
        end
    }

    await loadDashboardData()
})
</script>
