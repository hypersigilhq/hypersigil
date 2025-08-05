import { WorkerRegistry } from '../worker-registry';
import { WorkerContext } from '../types';
import { Execution, settingsModel } from '../../models';
import { config } from '../../config';
import crypto from 'crypto';

export interface WebhookDeliveryData {
    webhookId: string;
    data: {
        event: "execution-finished"
        executionId: string,
        status: Execution['status'],
    }
}

WorkerRegistry.register('webhook-delivery', async (
    data: WebhookDeliveryData,
    context: WorkerContext
): Promise<boolean | void> => {
    let webhook = await settingsModel.getSettingById<"webhook-destination">(data.webhookId)

    if (!webhook) {
        context.terminate("Webhook not found")
        return false
    }

    if (!webhook.active) {
        context.terminate("Webhook not active")
        return false
    }

    // Prepare webhook payload
    const timestamp = new Date().toISOString();
    const payload = {
        ...data.data,
        timestamp,
        webhookId: data.webhookId
    };

    const payloadString = JSON.stringify(payload);

    // Generate HMAC-SHA256 signature using static key
    const signature = crypto
        .createHmac('sha256', config.encryptionKey)
        .update(payloadString)
        .digest('hex');

    try {
        const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Hypersigil-Webhook/1.0',
                'X-Hypersigil-Signature': `sha256=${signature}`,
                'X-Hypersigil-Timestamp': timestamp,
                'X-Hypersigil-Webhook-Id': data.webhookId
            },
            body: payloadString,
            signal: AbortSignal.timeout(5000), // 5 second timeout
            redirect: 'manual' // Don't follow redirects
        });

        if (response.status === 200 || response.status === 201) {
            context.logger.info(`Webhook delivered successfully to ${webhook.url}`, {
                webhookId: data.webhookId,
                status: response.status,
                executionId: data.data.executionId
            });
            return true;
        } else {
            throw new Error(`Webhook delivery failed with status ${response.status}`);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        context.logger.error(`Webhook delivery failed to ${webhook.url}`, {
            webhookId: data.webhookId,
            error: errorMessage,
            executionId: data.data.executionId
        });
        throw new Error(`Webhook delivery failed: ${errorMessage}`);
    }
});
