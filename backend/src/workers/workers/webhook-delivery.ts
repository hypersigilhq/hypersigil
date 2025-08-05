import { WorkerRegistry } from '../worker-registry';
import { WorkerContext } from '../types';
import { Execution, settingsModel } from '../../models';

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

    // webhook delivery here, deliver data in the body via POST
    // use header to send a signature for the recipient to verify
    // use 5 second time out
    // expect 200/201 response (dont read body), otherwise throw Error

    return true
});
