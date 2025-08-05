import { WorkerRegistry } from '../worker-registry';
import { WorkerContext } from '../types';
import { Execution, settingsModel } from '../../models';
import { config } from '../../config';
import crypto, { randomUUID } from 'crypto';

export interface WebhookDeliveryData {
    webhookId: string;
    url?: string;
    data: {
        event: "test",
        time: Date
    } | {
        event: "execution-finished"
        executionId: string,
        status: Execution['status'],
    }
}

WorkerRegistry.register('webhook-delivery', async (
    data: WebhookDeliveryData,
    context: WorkerContext
): Promise<boolean | void> => {
    let webhookUrl = data.url

    if (data.webhookId?.length) {
        let webhook = await settingsModel.getSettingById<"webhook-destination">(data.webhookId)

        if (!webhook) {
            context.terminate("Webhook not found")
            return false
        }

        if (!webhook.active) {
            context.terminate("Webhook not active")
            return false
        }

        webhookUrl = webhook.url
    }

    // Prepare webhook payload
    const timestamp = new Date().toISOString();
    const payload = {
        ...data.data,
    };

    const payloadString = JSON.stringify(payload);

    // Generate HMAC-SHA256 signature using static key
    const signature = crypto
        .createHmac('sha256', config.webhookSignatureKey)
        .update(timestamp + payloadString + context.jobId)
        .digest('hex');

    try {

        if (!webhookUrl) {
            context.terminate("Missing URL")
            return false
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Hypersigil-Webhook/1.0',
                'X-Hypersigil-Signature': `sha256=${signature}`,
                'X-Hypersigil-Timestamp': timestamp,
                'X-Hypersigil-Webhook-Id': context.jobId
            },
            body: payloadString,
            signal: AbortSignal.timeout(5000), // 5 second timeout
            redirect: 'manual' // Don't follow redirects
        });

        if (response.status === 200 || response.status === 201) {
            context.logger.info(`Webhook delivered successfully to ${webhookUrl}`, {
                webhookId: data.webhookId,
                status: response.status,
            });
            return true;
        } else {
            throw new Error(`Webhook delivery failed with status ${response.status}`);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        context.logger.error(`Webhook delivery failed to ${webhookUrl}`, {
            webhookId: data.webhookId,
            error: errorMessage,
        });
        throw new Error(`Webhook delivery failed: ${errorMessage}`);
    }
});
