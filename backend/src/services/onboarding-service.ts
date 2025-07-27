import { promptModel } from '../models/prompt';
import { settingsModel } from '../models/settings';

export interface OnboardingStatus {
    promptAvailable: boolean;
    llmApiKeyAvailable: boolean;
}

class OnboardingService {
    /**
     * Get the current onboarding status by checking if essential data exists
     */
    public async getOnboardingStatus(): Promise<Result<OnboardingStatus, string>> {
        try {
            // Check if at least one prompt exists
            const promptCount = await promptModel.count({});
            const promptAvailable = promptCount > 0;

            // Check if at least one LLM API key setting exists
            const llmApiKeyCount = await settingsModel.count({ type: 'llm-api-key' });
            const llmApiKeyAvailable = llmApiKeyCount > 0;

            return Ok({
                promptAvailable,
                llmApiKeyAvailable
            });
        } catch (error) {
            return Err(`Failed to get onboarding status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export const onboardingService = new OnboardingService();
