<template>
    <div class="bar-chart" :style="{ height: chartHeight }">
        <div class="bar-chart-container">
            <!-- Y-axis labels -->
            <div class="y-axis">
                <div v-for="label in yAxisLabels" :key="label" class="y-axis-label">
                    {{ formatValue(label) }}
                </div>
            </div>

            <!-- Chart area -->
            <div class="chart-area">
                <!-- Grid lines -->
                <div v-for="line in yAxisLabels.slice(0, -1)" :key="`grid-${line}`" class="grid-line"
                    :style="{ bottom: `${(line / maxValue) * 100}%` }"></div>

                <!-- Bars -->
                <div class="bars-container">
                    <div v-for="(item, index) in data" :key="item.label" class="bar-wrapper"
                        :style="{ width: barWidth }">
                        <div class="bar" :style="{
                            height: `${(item.value / maxValue) * 100}%`,
                            backgroundColor: colors[index % colors.length],
                            transitionDelay: `${index * 50}ms`
                        }" @mouseover="showTooltip(item, $event)" @mouseleave="hideTooltip">
                            <div class="bar-value">{{ formatValue(item.value) }}</div>
                        </div>
                        <div class="bar-label">{{ item.label }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tooltip -->
        <div v-if="tooltip.visible" class="bar-tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
            <div class="tooltip-label">{{ tooltip.label }}</div>
            <div class="tooltip-value">{{ formatValue(tooltip.value) }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface BarChartData {
    label: string
    value: number
}

interface Props {
    data: BarChartData[]
    height?: string
    color?: string
    showValues?: boolean
    formatValue?: (value: number) => string
}

const props = withDefaults(defineProps<Props>(), {
    height: '300px',
    color: '#3b82f6',
    showValues: true,
    formatValue: (value: number) => value.toLocaleString()
})

const tooltip = ref({
    visible: false,
    x: 0,
    y: 0,
    label: '',
    value: 0
})

const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // yellow
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
]

const chartHeight = computed(() => props.height)

const maxValue = computed(() => {
    if (props.data.length === 0) return 1
    return Math.max(...props.data.map(item => item.value))
})

const yAxisLabels = computed(() => {
    const labels = []
    const step = maxValue.value / 5
    for (let i = 0; i <= 5; i++) {
        labels.push(Math.round(step * i))
    }
    return labels
})

const barWidth = computed(() => {
    if (props.data.length === 0) return '100%'
    return `${100 / props.data.length}%`
})

const showTooltip = (item: BarChartData, event: MouseEvent) => {
    // Don't show tooltip for zero or negative values
    if (item.value <= 0) {
        hideTooltip()
        return
    }

    const rect = (event.target as HTMLElement).getBoundingClientRect()
    tooltip.value = {
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        label: item.label,
        value: item.value
    }
}

const hideTooltip = () => {
    tooltip.value.visible = false
}
</script>

<style scoped>
.bar-chart {
    position: relative;
    width: 100%;
    background: hsl(var(--background));
    border-radius: calc(var(--radius) - 2px);
    padding: 1rem;
}

.bar-chart-container {
    display: flex;
    height: 100%;
    align-items: end;
}

.y-axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 60px;
    height: 100%;
    padding-right: 0.5rem;
    border-right: 1px solid hsl(var(--border));
    margin-right: 1rem;
}

.y-axis-label {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    text-align: right;
}

.chart-area {
    flex: 1;
    position: relative;
    height: 100%;
}

.grid-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: hsl(var(--border));
    opacity: 0.3;
}

.bars-container {
    display: flex;
    align-items: end;
    height: 100%;
    gap: 0.25rem;
}

.bar-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
}

.bar {
    position: relative;
    min-height: 2px;
    border-radius: 2px 2px 0 0;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: end;
    justify-content: center;
    opacity: 0;
    animation: fadeInUp 0.5s ease forwards;
}

.bar:hover {
    opacity: 0.8 !important;
    transform: scaleY(1.05);
}

.bar-value {
    position: absolute;
    top: -1.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(var(--foreground));
    opacity: 0;
    transition: opacity 0.2s ease;
}

.bar:hover .bar-value {
    opacity: 1;
}

.bar-label {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.bar-tooltip {
    position: fixed;
    background: hsl(var(--popover));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    padding: 0.5rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    pointer-events: none;
    z-index: 1000;
    transform: translate(-50%, -100%);
    margin-top: -0.5rem;
}

.tooltip-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--popover-foreground));
}

.tooltip-value {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: scaleY(0);
    }

    to {
        opacity: 1;
        transform: scaleY(1);
    }
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .y-axis {
        width: 40px;
    }

    .y-axis-label {
        font-size: 0.7rem;
    }

    .bar-label {
        font-size: 0.7rem;
    }

    .bar-value {
        font-size: 0.7rem;
    }
}
</style>
