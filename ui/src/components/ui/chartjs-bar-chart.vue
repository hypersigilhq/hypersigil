<template>
    <div class="chartjs-bar-chart">
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
    type ChartOptions
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarController, BarElement, Title, Tooltip, Legend)

interface BarChartData {
    label: string
    value: number
}

interface Props {
    data: BarChartData[]
    height?: string
    title?: string
    formatValue?: (value: number) => string
}

const props = withDefaults(defineProps<Props>(), {
    height: '300px',
    title: '',
    formatValue: (value: number) => value.toLocaleString()
})

const chartCanvas = ref<HTMLCanvasElement>()
let chart: ChartJS | null = null

const chartData = computed((): ChartData<'bar'> => ({
    labels: props.data.map(item => item.label),
    datasets: [{
        label: props.title || 'Value',
        data: props.data.map(item => item.value),
        backgroundColor: [
            'hsl(var(--chart-1))',
            'hsl(var(--chart-2))',
            'hsl(var(--chart-3))',
            'hsl(var(--chart-4))',
            'hsl(var(--chart-5))',
            'hsl(var(--chart-1))',
            'hsl(var(--chart-2))',
            'hsl(var(--chart-3))',
            'hsl(var(--chart-4))',
            'hsl(var(--chart-5))'
        ],
        borderColor: [
            'hsl(var(--chart-1))',
            'hsl(var(--chart-2))',
            'hsl(var(--chart-3))',
            'hsl(var(--chart-4))',
            'hsl(var(--chart-5))',
            'hsl(var(--chart-1))',
            'hsl(var(--chart-2))',
            'hsl(var(--chart-3))',
            'hsl(var(--chart-4))',
            'hsl(var(--chart-5))'
        ],
        borderWidth: 1
    }]
}))

const chartOptions = computed((): ChartOptions<'bar'> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            filter: (tooltipItem) => {
                return tooltipItem.parsed.y > 0 // Only show items with values > 0
            },
            callbacks: {
                label: (context) => {
                    return `${context.label}: ${props.formatValue(context.parsed.y)}`
                }
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                callback: (value) => props.formatValue(Number(value)),
                color: 'hsl(var(--muted-foreground))'
            },
            grid: {
                color: 'hsl(var(--border))'
            }
        },
        x: {
            ticks: {
                color: 'hsl(var(--muted-foreground))'
            },
            grid: {
                display: false
            }
        }
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
.chartjs-bar-chart {
    width: 100%;
    height: v-bind(height);
    position: relative;
}
</style>
