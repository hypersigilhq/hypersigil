import { ref, type Ref } from 'vue'
import { commonApi } from './api-client'
import { useUI } from './ui'
import type { OnboardingStatus } from './definitions/common'

class OnboardingService {
    private status: Ref<OnboardingStatus | null> = ref(null)
    private isLoading: Ref<boolean> = ref(false)
    private ui = useUI()

    async checkOnboardingStatus(): Promise<void> {
        if (this.isLoading.value) return

        this.isLoading.value = true
        try {
            const status = await commonApi.getOnboardingStatus()
            this.status.value = status
            this.showOnboardingWarningIfNeeded(status)
        } catch (error) {
            console.error('Failed to check onboarding status:', error)
        } finally {
            this.isLoading.value = false
        }
    }

    private showOnboardingWarningIfNeeded(status: OnboardingStatus): void {
        const missingSteps: string[] = []

        if (!status.llmApiKeyAvailable) {
            missingSteps.push('adding LLM API key')
        }

        if (!status.promptAvailable) {
            missingSteps.push('adding a prompt')
        }

        if (missingSteps.length > 0) {
            const stepCount = missingSteps.length
            const stepText = stepCount === 1 ? 'step' : 'steps'
            const stepsDescription = missingSteps.join(' and ')

            this.ui.topbarWarning(
                `There ${stepCount === 1 ? 'is' : 'are'} ${stepCount} onboarding ${stepText} to be completed: ${stepsDescription}.`
            )
        }
    }

    async refreshOnboardingStatus(): Promise<void> {
        await this.checkOnboardingStatus()
    }

    getStatus(): Ref<OnboardingStatus | null> {
        return this.status
    }

    isStatusLoading(): Ref<boolean> {
        return this.isLoading
    }
}

// Create singleton instance
const onboardingService = new OnboardingService()

export const useOnboarding = () => {
    return {
        checkOnboardingStatus: () => onboardingService.checkOnboardingStatus(),
        refreshOnboardingStatus: () => onboardingService.refreshOnboardingStatus(),
        status: onboardingService.getStatus(),
        isLoading: onboardingService.isStatusLoading()
    }
}
