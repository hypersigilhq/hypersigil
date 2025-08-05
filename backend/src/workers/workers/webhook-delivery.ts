import { WorkerRegistry } from '../worker-registry';
import { WorkerContext } from '../types';
import { Execution, settingsModel } from '../../models';
import { config } from '../../config';
import crypto, { randomUUID } from 'crypto';

interface WebhookErrorDetails {
    message: string;
    type: 'network' | 'dns' | 'timeout' | 'ssl' | 'http' | 'connection' | 'unknown';
    code?: string;
    isRetryable: boolean;
}

function categorizeWebhookError(error: unknown, url?: string): WebhookErrorDetails {
    if (!(error instanceof Error)) {
        return {
            message: 'Unknown error occurred',
            type: 'unknown',
            isRetryable: false
        };
    }

    const errorMessage = error.message.toLowerCase();
    const originalMessage = error.message;

    // DNS resolution errors
    if (errorMessage.includes('getaddrinfo') ||
        errorMessage.includes('enotfound') ||
        errorMessage.includes('dns') ||
        errorMessage.includes('name not resolved')) {
        const hostname = url ? (() => {
            try {
                return new URL(url).hostname;
            } catch {
                return 'invalid URL';
            }
        })() : 'unknown host';

        return {
            message: `DNS resolution failed for ${hostname}: ${originalMessage}`,
            type: 'dns',
            code: 'DNS_RESOLUTION_FAILED',
            isRetryable: true
        };
    }

    // Connection errors
    if (errorMessage.includes('econnrefused') ||
        errorMessage.includes('connection refused')) {
        const hostname = url ? (() => {
            try {
                return new URL(url).hostname;
            } catch {
                return 'invalid URL';
            }
        })() : 'target server';

        return {
            message: `Connection refused by ${hostname}: ${originalMessage}`,
            type: 'connection',
            code: 'CONNECTION_REFUSED',
            isRetryable: true
        };
    }

    if (errorMessage.includes('econnreset') ||
        errorMessage.includes('connection reset')) {
        return {
            message: `Connection reset by server: ${originalMessage}`,
            type: 'connection',
            code: 'CONNECTION_RESET',
            isRetryable: true
        };
    }

    if (errorMessage.includes('ehostunreach') ||
        errorMessage.includes('host unreachable')) {
        return {
            message: `Host unreachable: ${originalMessage}`,
            type: 'network',
            code: 'HOST_UNREACHABLE',
            isRetryable: true
        };
    }

    if (errorMessage.includes('enetunreach') ||
        errorMessage.includes('network unreachable')) {
        return {
            message: `Network unreachable: ${originalMessage}`,
            type: 'network',
            code: 'NETWORK_UNREACHABLE',
            isRetryable: true
        };
    }

    // Timeout errors
    if (errorMessage.includes('timeout') ||
        errorMessage.includes('etimedout') ||
        error.name === 'TimeoutError') {
        return {
            message: `Request timeout after 5 seconds: ${originalMessage}`,
            type: 'timeout',
            code: 'REQUEST_TIMEOUT',
            isRetryable: true
        };
    }

    // SSL/TLS errors
    if (errorMessage.includes('ssl') ||
        errorMessage.includes('tls') ||
        errorMessage.includes('certificate') ||
        errorMessage.includes('cert') ||
        errorMessage.includes('handshake')) {
        return {
            message: `SSL/TLS error: ${originalMessage}`,
            type: 'ssl',
            code: 'SSL_ERROR',
            isRetryable: false
        };
    }

    // HTTP status errors (already handled in main code, but catch any that slip through)
    if (errorMessage.includes('status') && /\d{3}/.test(errorMessage)) {
        const statusMatch = errorMessage.match(/status (\d{3})/);
        const status = statusMatch && statusMatch[1] ? parseInt(statusMatch[1]) : 0;
        const isRetryable = status >= 500 || status === 429; // Server errors and rate limiting

        return {
            message: `HTTP error: ${originalMessage}`,
            type: 'http',
            code: `HTTP_${status}`,
            isRetryable
        };
    }

    // Generic network errors
    if (errorMessage.includes('network') ||
        errorMessage.includes('fetch')) {
        return {
            message: `Network error: ${originalMessage}`,
            type: 'network',
            code: 'NETWORK_ERROR',
            isRetryable: true
        };
    }

    // Default case
    return {
        message: originalMessage,
        type: 'unknown',
        isRetryable: false
    };
}

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
        const errorDetails = categorizeWebhookError(error, webhookUrl);
        context.logger.error(`Webhook delivery failed to ${webhookUrl || 'unknown URL'}`, {
            webhookId: data.webhookId,
            error: errorDetails.message,
            errorType: errorDetails.type,
            errorCode: errorDetails.code,
            isRetryable: errorDetails.isRetryable,
        });
        throw new Error(`Webhook delivery failed: ${errorDetails.message}`);
    }
});
