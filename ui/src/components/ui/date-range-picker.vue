<template>
    <div class="grid gap-2">
        <DropdownMenu>
            <DropdownMenuTrigger as-child>
                <Button id="date" variant="outline" :class="cn(
                    'w-[300px] justify-start text-left font-normal',
                    !dateRange.start && 'text-muted-foreground'
                )">
                    <CalendarIcon class="mr-2 h-4 w-4" />
                    <template v-if="dateRange.start">
                        <template v-if="dateRange.end">
                            {{ formatDateRange(dateRange.start, dateRange.end) }}
                        </template>
                        <template v-else>
                            {{ formatDate(dateRange.start) }}
                        </template>
                    </template>
                    <template v-else>
                        Pick a date range
                    </template>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-[400px] p-4">
                <div class="flex flex-wrap gap-2 mb-4">
                    <Button variant="outline" size="sm" @click="setToday">
                        Today
                    </Button>
                    <Button variant="outline" size="sm" @click="setThisWeek">
                        This week
                    </Button>
                    <Button variant="outline" size="sm" @click="setLast7Days">
                        Last 7 days
                    </Button>
                    <Button variant="outline" size="sm" @click="setLast30Days">
                        Last 30 days
                    </Button>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <!-- Start Date -->
                    <div>
                        <label class="text-sm font-medium mb-2 block">Start Date</label>
                        <Input type="date" :model-value="startDateInput" @update:model-value="updateStartDate"
                            class="w-full" />
                    </div>

                    <!-- End Date -->
                    <div>
                        <label class="text-sm font-medium mb-2 block">End Date</label>
                        <Input type="date" :model-value="endDateInput" @update:model-value="updateEndDate"
                            class="w-full" />
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CalendarIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface DateRange {
    start: Date | null
    end: Date | null
}

interface Props {
    modelValue: DateRange
}

interface Emits {
    (e: 'update:modelValue', value: DateRange): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

const dateRange = ref<DateRange>(props.modelValue || { start: null, end: null })

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
    if (newValue) {
        dateRange.value = { ...newValue }
    }
}, { deep: true })

// Watch for internal changes and emit
watch(dateRange, (newValue) => {
    emits('update:modelValue', { ...newValue })
}, { deep: true })

// Computed properties for input values (YYYY-MM-DD format for HTML date inputs)
const startDateInput = computed(() => {
    return dateRange.value.start ? formatDateForInput(dateRange.value.start) : ''
})

const endDateInput = computed(() => {
    return dateRange.value.end ? formatDateForInput(dateRange.value.end) : ''
})

// Helper functions
const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0]
}

const parseDateFromInput = (dateString: string): Date | null => {
    if (!dateString) return null
    const date = new Date(dateString + 'T00:00:00')
    return isNaN(date.getTime()) ? null : date
}

const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

const formatDateRange = (start: Date, end: Date): string => {
    return `${formatDate(start)} - ${formatDate(end)}`
}

// Event handlers
const updateStartDate = (value: string | number) => {
    const dateString = typeof value === 'string' ? value : value.toString()
    const date = parseDateFromInput(dateString)
    dateRange.value.start = date

    // If end date is before start date, clear it
    if (dateRange.value.end && date && dateRange.value.end < date) {
        dateRange.value.end = null
    }
}

const updateEndDate = (value: string | number) => {
    const dateString = typeof value === 'string' ? value : value.toString()
    const date = parseDateFromInput(dateString)
    dateRange.value.end = date

    // If start date is after end date, clear it
    if (dateRange.value.start && date && dateRange.value.start > date) {
        dateRange.value.start = null
    }
}

const setToday = () => {
    const today = new Date()
    dateRange.value = {
        start: today,
        end: today
    }
}

const setThisWeek = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    // Set to Monday of current week (0 = Sunday, so we go back to Monday)
    const dayOfWeek = today.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(today.getDate() - daysToSubtract)

    dateRange.value = {
        start: startOfWeek,
        end: today
    }
}

const setLast7Days = () => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 7)

    dateRange.value = {
        start,
        end
    }
}

const setLast30Days = () => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)

    dateRange.value = {
        start,
        end
    }
}
</script>
