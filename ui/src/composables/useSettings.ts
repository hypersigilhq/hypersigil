import { ref, watch, computed, type Ref } from 'vue'

// Define the settings interface
export interface AppSettings {
    executionViewCommentContainerWidth: number,
    executionBundleFirstColumnWidht: number,
    executionBundleSecondColumnWidht: number,
}

// Default settings
const defaultSettings: AppSettings = {
    executionBundleFirstColumnWidht: 200,
    executionBundleSecondColumnWidht: 300,
    executionViewCommentContainerWidth: 300
}

const STORAGE_KEY = 'app_settings'

// Global reactive settings state
const settings = ref<AppSettings>({ ...defaultSettings })

// Load settings from localStorage on initialization
const loadSettings = (): void => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const parsedSettings = JSON.parse(stored) as Partial<AppSettings>
            // Merge with defaults to ensure all properties exist
            settings.value = { ...defaultSettings, ...parsedSettings }
        }
    } catch (error) {
        console.warn('Failed to load settings from localStorage:', error)
        settings.value = { ...defaultSettings }
    }
}

// Save settings to localStorage
const saveSettings = (): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
    } catch (error) {
        console.error('Failed to save settings to localStorage:', error)
    }
}

// Initialize settings on first import
loadSettings()

// Watch for changes and auto-save
watch(settings, saveSettings, { deep: true })

export function useSettings() {
    // Get a specific setting value
    const getSetting = <K extends keyof AppSettings>(key: K): AppSettings[K] => {
        return settings.value[key]
    }

    // Update a specific setting
    const updateSetting = <K extends keyof AppSettings>(
        key: K,
        value: AppSettings[K]
    ): void => {
        settings.value[key] = value
    }

    // Update multiple settings at once
    const updateSettings = (updates: Partial<AppSettings>): void => {
        Object.assign(settings.value, updates)
    }

    // Reset settings to defaults
    const resetSettings = (): void => {
        settings.value = { ...defaultSettings }
    }

    // Reset a specific setting to default
    const resetSetting = <K extends keyof AppSettings>(key: K): void => {
        settings.value[key] = defaultSettings[key]
    }

    // Get reactive reference to specific setting
    const getSettingRef = <K extends keyof AppSettings>(key: K): Ref<AppSettings[K]> => {
        return computed({
            get: () => settings.value[key],
            set: (value: AppSettings[K]) => {
                settings.value[key] = value
            }
        })
    }

    return {
        // Reactive settings object
        settings: settings as Readonly<Ref<AppSettings>>,

        // Methods
        getSetting,
        updateSetting,
        updateSettings,
        resetSettings,
        resetSetting,
        getSettingRef,

        // Utility methods
        loadSettings,
        saveSettings
    }
}
