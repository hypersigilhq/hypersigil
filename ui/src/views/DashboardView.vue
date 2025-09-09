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
            <!-- Combined Filter Controls -->
            <div class="mb-6">
                <div class="flex flex-col lg:flex-row gap-4 items-start lg:items-center flex-wrap">
                    <!-- Date Range Picker -->
                    <DateRangePicker v-model="selectedDateRange" @update:model-value="onDateRangeChange" />

                    <!-- Grouping Mode Switch -->
                    <div class="flex items-center gap-2">
                        <label class="text-sm font-medium">Grouping:</label>
                        <select v-model="groupingMode"
                            class="px-3 py-1 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                            <option value="none">None</option>
                            <option value="provider">Provider</option>
                            <option value="provider-model">Provider + Model</option>
                        </select>
                    </div>

                    <!-- Input/Output Toggle -->
                    <div class="flex items-center gap-2">
                        <input type="checkbox" id="showInputOutput" v-model="showInputOutput"
                            class="rounded border border-input">
                        <label for="showInputOutput" class="text-sm font-medium">Show Input/Output Breakdown</label>
                    </div>

                    <!-- Provider Filter -->
                    <div class="flex items-center gap-2">
                        <label class="text-sm font-medium">Providers:</label>
                        <Select v-model="selectedProviders" multiple>
                            <SelectTrigger class="w-48">
                                <SelectValue placeholder="Select providers..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="provider in availableProviders" :key="provider" :value="provider">
                                    {{ provider }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <button @click="selectedProviders = []"
                            class="text-xs text-muted-foreground hover:text-foreground">
                            Clear
                        </button>
                    </div>
                </div>
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
                        <CardTitle>{{ chartTitle }} (Grouped by Provider/Model)</CardTitle>
                        <CardDescription>
                            {{ chartDescription }} - Shows input and output token usage by provider and model
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartjsGroupedStackedBarChart :data="dailyGroupedData" height="400px"
                            :format-value="formatNumber" :show-input-output="showInputOutput"
                            :grouping-mode="groupingMode" :selected-providers="selectedProviders" />
                    </CardContent>
                </Card>

                <Card v-if="showHourlyChart">
                    <CardHeader>
                        <CardTitle>{{ chartTitle }} (Grouped by Provider/Model)</CardTitle>
                        <CardDescription>
                            {{ chartDescription }} - Shows input and output token usage by provider and model
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartjsGroupedStackedBarChart :data="hourlyGroupedData" height="400px"
                            :format-value="formatNumber" :show-input-output="showInputOutput"
                            :grouping-mode="groupingMode" :selected-providers="selectedProviders" />
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
import ChartjsGroupedStackedBarChart from '@/components/ui/chartjs-grouped-stacked-bar-chart.vue'
import DateRangePicker from '@/components/ui/date-range-picker.vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
const dailyGroupedData = ref<Array<{
    timeLabel: string
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
}>>([])
const hourlyGroupedData = ref<Array<{
    timeLabel: string
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
}>>([])

// Grouping mode state
const groupingMode = ref<'none' | 'provider' | 'provider-model'>('provider-model')

// Token type and provider filter state
const showInputOutput = ref(true)
const selectedProviders = ref<string[]>([])
const availableProviders = ref<string[]>([])

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

// Computed properties for chart data (legacy - kept for potential future use)

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

// Gap-filling functions
// These functions ensure that charts display complete time spans by filling missing time periods with zero values.
// This provides consistent visualization even when there are gaps in the data (e.g., days/hours with no executions).
const fillDailyGaps = (data: Array<{
    timeLabel: string
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
}>, startDate: Date, endDate: Date): Array<{
    timeLabel: string
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
}> => {
    // If no data, return empty array
    if (!data || data.length === 0) {
        return []
    }

    // Get all unique provider/model combinations from the data
    const providerModelCombinations = new Set<string>()
    data.forEach(item => {
        providerModelCombinations.add(`${item.provider}:${item.model}`)
    })

    // Generate all dates in the range using consistent formatting
    const allDates: string[] = []
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
        const dateLabel = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        allDates.push(dateLabel)
        currentDate.setDate(currentDate.getDate() + 1)
    }

    // Create filled data
    const filledData: Array<{
        timeLabel: string
        provider: string
        model: string
        inputTokens: number
        outputTokens: number
        totalTokens: number
    }> = []

    // For each date in the full range and each provider/model combination, add data
    allDates.forEach(dateLabel => {
        providerModelCombinations.forEach(providerModelKey => {
            const [provider, model] = providerModelKey.split(':')

            // Look for existing data for this exact date/provider/model combination
            const existingData = data.find(item =>
                item.timeLabel === dateLabel &&
                item.provider === provider &&
                item.model === model
            )

            if (existingData) {
                // Preserve existing data exactly as it is
                filledData.push(existingData)
            } else {
                // Add zero entry for missing combination
                filledData.push({
                    timeLabel: dateLabel,
                    provider,
                    model,
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0
                })
            }
        })
    })

    return filledData
}

const fillHourlyGaps = (data: Array<{
    timeLabel: string
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
}>): Array<{
    timeLabel: string
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
}> => {
    // If no data, return empty array
    if (!data || data.length === 0) {
        return []
    }

    // Get all unique provider/model combinations from the data
    const providerModelCombinations = new Set<string>()
    data.forEach(item => {
        providerModelCombinations.add(`${item.provider}:${item.model}`)
    })

    // Generate all 24 hours
    const allHours: string[] = []
    for (let hour = 0; hour < 24; hour++) {
        allHours.push(`${hour}:00`)
    }

    // Create filled data
    const filledData: Array<{
        timeLabel: string
        provider: string
        model: string
        inputTokens: number
        outputTokens: number
        totalTokens: number
    }> = []

    // For each hour in the full range and each provider/model combination, add data
    allHours.forEach(hourLabel => {
        providerModelCombinations.forEach(providerModelKey => {
            const [provider, model] = providerModelKey.split(':')

            // Look for existing data for this exact hour/provider/model combination
            const existingData = data.find(item =>
                item.timeLabel === hourLabel &&
                item.provider === provider &&
                item.model === model
            )

            if (existingData) {
                // Preserve existing data exactly as it is
                filledData.push(existingData)
            } else {
                // Add zero entry for missing combination
                filledData.push({
                    timeLabel: hourLabel,
                    provider,
                    model,
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0
                })
            }
        })
    })

    return filledData
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
        const [statsResponse, dailyResponse, hourlyResponse, providerModelResponse, dailyGroupedResponse, hourlyGroupedResponse] = await Promise.all([
            dashboardApi.getStats(dateParams),
            dashboardApi.getDailyTokenUsage(dateParams),
            dashboardApi.getHourlyTokenUsage(dateParams),
            dashboardApi.getTokenUsageByProviderModel(dateParams),
            dashboardApi.getDailyTokenUsageByProviderModel(dateParams),
            dashboardApi.getHourlyTokenUsageByProviderModel(dateParams)
        ])

        // Update reactive state
        stats.value = statsResponse
        dailyData.value = dailyResponse
        hourlyData.value = hourlyResponse
        providerModelData.value = providerModelResponse

        // Transform grouped data for chart component
        const rawDailyData = dailyGroupedResponse.map(item => ({
            timeLabel: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            provider: item.provider,
            model: item.model,
            inputTokens: item.inputTokens,
            outputTokens: item.outputTokens,
            totalTokens: item.totalTokens
        }))

        const rawHourlyData = hourlyGroupedResponse.map(item => ({
            timeLabel: `${item.hour}:00`,
            provider: item.provider,
            model: item.model,
            inputTokens: item.inputTokens,
            outputTokens: item.outputTokens,
            totalTokens: item.totalTokens
        }))

        // Fill gaps in the data to ensure complete time spans
        if (selectedDateRange.value.start && selectedDateRange.value.end) {
            const filledDaily = fillDailyGaps(rawDailyData, selectedDateRange.value.start, selectedDateRange.value.end)
            dailyGroupedData.value = filledDaily.length > 0 ? filledDaily : rawDailyData
        } else {
            dailyGroupedData.value = rawDailyData
        }

        const filledHourly = fillHourlyGaps(rawHourlyData)
        hourlyGroupedData.value = filledHourly.length > 0 ? filledHourly : rawHourlyData

        // Update available providers list
        const allProviders = new Set([
            ...dailyGroupedResponse.map(item => item.provider),
            ...hourlyGroupedResponse.map(item => item.provider)
        ])
        availableProviders.value = Array.from(allProviders).sort()

        // Reset selected providers if they include providers that are no longer available
        selectedProviders.value = selectedProviders.value.filter(provider =>
            availableProviders.value.includes(provider)
        )

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
