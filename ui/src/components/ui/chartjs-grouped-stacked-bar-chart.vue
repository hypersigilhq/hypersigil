<template>
    <div class="chartjs-grouped-stacked-bar-chart">
        <canvas ref="chartCanvas"></canvas>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarController,
    BarElement,
    Title,
    Tooltip,
    Legend,
    type ChartData,
    type ChartOptions,
    type ChartDataset
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarController, BarElement, Title, Tooltip, Legend)

interface GroupedBarChartData {
    timeLabel: string
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
}

interface Props {
    data: GroupedBarChartData[]
    height?: string
    title?: string
    formatValue?: (value: number) => string
    showInputOutput?: boolean
    groupingMode?: 'none' | 'provider' | 'provider-model'
    selectedProviders?: string[]
}

const props = withDefaults(defineProps<Props>(), {
    height: '400px',
    title: '',
    formatValue: (value: number) => value.toLocaleString(),
    showInputOutput: true,
    groupingMode: 'provider-model'
})

const chartCanvas = ref<HTMLCanvasElement>()
let chart: ChartJS | null = null

// Hardcoded base colors for each provider
const providerBaseColors: Record<string, { hue: number; saturation: number; lightness: number }> = {
    openai: { hue: 220, saturation: 70, lightness: 50 },      // Blue
    anthropic: { hue: 280, saturation: 70, lightness: 50 },   // Purple
    ollama: { hue: 160, saturation: 70, lightness: 50 },      // Green
    google: { hue: 40, saturation: 70, lightness: 50 },       // Orange
    deepseek: { hue: 320, saturation: 70, lightness: 50 },    // Pink
    default: { hue: 200, saturation: 70, lightness: 50 }      // Teal
}

// Model shade variations within each provider (different lightness levels)
const modelLightnessVariations = [70, 75, 65, 60, 55, 80] // Base, lighter, darker, etc.

// Input/Output saturation variations
const inputSaturation = 80  // More vibrant for input
const outputSaturation = 60 // More muted for output

const getProviderBaseColor = (provider: string) => {
    return providerBaseColors[provider.toLowerCase()] || providerBaseColors.default
}

// Generate color for specific provider-model combination
const getModelColor = (provider: string, model: string, isInput: boolean): string => {
    const baseColor = getProviderBaseColor(provider)
    const saturation = isInput ? inputSaturation : outputSaturation

    // Create consistent model-to-lightness mapping
    const modelHash = model.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0)
    const lightnessIndex = modelHash % modelLightnessVariations.length
    const lightness = modelLightnessVariations[lightnessIndex]

    return `hsl(${baseColor.hue}, ${saturation}%, ${lightness}%)`
}

// Generate border color (slightly darker)
const getModelBorderColor = (provider: string, model: string, isInput: boolean): string => {
    const baseColor = getProviderBaseColor(provider)
    const saturation = isInput ? inputSaturation : outputSaturation

    const modelHash = model.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0)
    const lightnessIndex = modelHash % modelLightnessVariations.length
    const lightness = Math.max(40, modelLightnessVariations[lightnessIndex] - 10) // Darker border

    return `hsl(${baseColor.hue}, ${saturation + 10}%, ${lightness}%)`
}

const chartData = computed((): ChartData<'bar'> => {
    // Filter data by selected providers
    const filteredData = props.selectedProviders && props.selectedProviders.length > 0
        ? props.data.filter(item => props.selectedProviders!.includes(item.provider))
        : props.data

    // Group data by time period
    const timeGroups = new Map<string, GroupedBarChartData[]>()

    filteredData.forEach(item => {
        const timeKey = item.timeLabel
        if (!timeGroups.has(timeKey)) {
            timeGroups.set(timeKey, [])
        }
        timeGroups.get(timeKey)!.push(item)
    })

    // Get all unique time labels
    const timeLabels = Array.from(timeGroups.keys()).sort()

    // Get all unique providers from filtered data
    const allProviders = Array.from(new Set(filteredData.map(item => item.provider)))

    // Create datasets based on grouping mode
    const datasets: ChartDataset<'bar'>[] = []

    if (props.groupingMode === 'none') {
        // No grouping: Each provider-model combination as separate bars
        const providerModelCombinations = new Map<string, { provider: string, model: string }>()

        filteredData.forEach(item => {
            const key = `${item.provider}-${item.model}`
            if (!providerModelCombinations.has(key)) {
                providerModelCombinations.set(key, { provider: item.provider, model: item.model })
            }
        })

        // Create separate datasets for each provider-model combination (no stacking)
        Array.from(providerModelCombinations.values()).forEach(({ provider, model }) => {
            datasets.push({
                label: `${provider} ${model}`,
                data: timeLabels.map(timeLabel => {
                    const timeData = timeGroups.get(timeLabel) || []
                    const modelData = timeData.find(item => item.provider === provider && item.model === model)
                    return modelData ? modelData.totalTokens : 0
                }),
                backgroundColor: getModelColor(provider, model, true),
                borderColor: getModelBorderColor(provider, model, true),
                borderWidth: 1,
                stack: undefined // No stacking for 'none' mode
            })
        })

    } else if (props.groupingMode === 'provider') {
        // Provider grouping: Aggregate all models within each provider
        allProviders.forEach(provider => {
            const baseColor = getProviderBaseColor(provider)
            datasets.push({
                label: provider,
                data: timeLabels.map(timeLabel => {
                    const providerData = timeGroups.get(timeLabel)?.filter(item => item.provider === provider) || []
                    return providerData.reduce((sum, item) => sum + item.totalTokens, 0)
                }),
                backgroundColor: `hsl(${baseColor.hue}, ${baseColor.saturation}%, ${baseColor.lightness}%)`,
                borderColor: `hsl(${baseColor.hue}, ${baseColor.saturation + 10}%, ${Math.max(40, baseColor.lightness - 10)}%)`,
                borderWidth: 1,
                stack: undefined // No stacking for provider mode
            })
        })

    } else if (props.groupingMode === 'provider-model') {
        // Provider+Model grouping: Show individual models within providers
        const providerModelCombinations = new Map<string, { provider: string, model: string }>()

        filteredData.forEach(item => {
            const key = `${item.provider}-${item.model}`
            if (!providerModelCombinations.has(key)) {
                providerModelCombinations.set(key, { provider: item.provider, model: item.model })
            }
        })

        // Create separate datasets for each provider-model combination with stacking
        Array.from(providerModelCombinations.values()).forEach(({ provider, model }) => {
            if (props.showInputOutput) {
                // Input tokens dataset for this specific model
                datasets.push({
                    label: `${provider} ${model} Input`,
                    data: timeLabels.map(timeLabel => {
                        const timeData = timeGroups.get(timeLabel) || []
                        const modelData = timeData.find(item => item.provider === provider && item.model === model)
                        return modelData ? modelData.inputTokens : 0
                    }),
                    backgroundColor: getModelColor(provider, model, true),
                    borderColor: getModelBorderColor(provider, model, true),
                    borderWidth: 1,
                    stack: provider // ✅ Fixed: Stack by provider, not provider-model
                })

                // Output tokens dataset for this specific model
                datasets.push({
                    label: `${provider} ${model} Output`,
                    data: timeLabels.map(timeLabel => {
                        const timeData = timeGroups.get(timeLabel) || []
                        const modelData = timeData.find(item => item.provider === provider && item.model === model)
                        return modelData ? modelData.outputTokens : 0
                    }),
                    backgroundColor: getModelColor(provider, model, false),
                    borderColor: getModelBorderColor(provider, model, false),
                    borderWidth: 1,
                    stack: provider // ✅ Fixed: Stack by provider, not provider-model
                })
            } else {
                // Total tokens dataset for this specific model
                datasets.push({
                    label: `${provider} ${model}`,
                    data: timeLabels.map(timeLabel => {
                        const timeData = timeGroups.get(timeLabel) || []
                        const modelData = timeData.find(item => item.provider === provider && item.model === model)
                        return modelData ? modelData.totalTokens : 0
                    }),
                    backgroundColor: getModelColor(provider, model, true),
                    borderColor: getModelBorderColor(provider, model, true),
                    borderWidth: 1,
                    stack: provider // Stack by provider for provider-model mode
                })
            }
        })
    }

    return {
        labels: timeLabels,
        datasets
    }
})

const chartOptions = computed((): ChartOptions<'bar'> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: true,
            position: 'top' as const
        },
        tooltip: {
            mode: props.groupingMode === 'none' ? 'nearest' : 'index' as const,
            intersect: false,
            callbacks: {
                label: (context) => {
                    const value = context.parsed.y
                    const datasetLabel = context.dataset.label || ''
                    return `${datasetLabel}: ${props.formatValue(value)} tokens`
                },
                footer: (tooltipItems) => {
                    const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0)
                    return `Total: ${props.formatValue(total)} tokens`
                }
            }
        }
    },
    scales: {
        x: {
            stacked: props.groupingMode !== 'none', // Only stack for provider and provider-model modes
            ticks: {
                color: 'hsl(var(--muted-foreground))'
            },
            grid: {
                display: false
            }
        },
        y: {
            stacked: props.groupingMode !== 'none', // ✅ Fixed: Enable Y-axis stacking for proper bar stacking
            beginAtZero: true,
            ticks: {
                callback: (value) => props.formatValue(Number(value)),
                color: 'hsl(var(--muted-foreground))'
            },
            grid: {
                color: 'hsl(var(--border))'
            }
        }
    },
    interaction: {
        mode: props.groupingMode === 'none' ? 'nearest' : 'index' as const,
        intersect: false
    }
}))

const createChart = () => {
    if (!chartCanvas.value) return

    chart = new ChartJS(chartCanvas.value, {
        type: 'bar',
        data: chartData.value,
        options: chartOptions.value
    })
}

const updateChart = () => {
    if (!chart) return

    chart.data = chartData.value
    chart.options = chartOptions.value
    chart.update()
}

const destroyChart = () => {
    if (chart) {
        chart.destroy()
        chart = null
    }
}

watch(() => props.data, () => {
    nextTick(() => {
        if (chart) {
            updateChart()
        } else {
            createChart()
        }
    })
}, { deep: true })

watch(() => props.showInputOutput, () => {
    nextTick(() => {
        if (chart) {
            updateChart()
        } else {
            createChart()
        }
    })
})

watch(() => props.groupingMode, () => {
    nextTick(() => {
        if (chart) {
            updateChart()
        } else {
            createChart()
        }
    })
})

watch(() => props.selectedProviders, () => {
    nextTick(() => {
        if (chart) {
            updateChart()
        } else {
            createChart()
        }
    })
}, { deep: true })

onMounted(() => {
    nextTick(() => {
        createChart()
    })
})

onUnmounted(() => {
    destroyChart()
})
</script>

<style scoped>
.chartjs-grouped-stacked-bar-chart {
    width: 100%;
    height: v-bind(height);
    position: relative;
}
</style>
