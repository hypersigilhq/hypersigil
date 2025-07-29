/**
 * Clipboard utility service that provides fallback support for non-HTTPS environments
 */

export interface ClipboardResult {
    success: boolean
    error?: string
}

/**
 * Check if the Clipboard API is available (requires secure context)
 */
function isClipboardApiAvailable(): boolean {
    return typeof navigator !== 'undefined' &&
        'clipboard' in navigator &&
        typeof navigator.clipboard.writeText === 'function'
}

/**
 * Fallback method using document.execCommand for non-secure contexts
 */
function copyTextFallback(text: string): ClipboardResult {
    try {
        // Create a temporary textarea element
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        textarea.style.top = '-999999px'
        textarea.setAttribute('readonly', '')

        // Add to DOM, select, and copy
        document.body.appendChild(textarea)
        textarea.select()
        textarea.setSelectionRange(0, 99999) // For mobile devices

        const successful = document.execCommand('copy')

        // Clean up
        document.body.removeChild(textarea)

        if (successful) {
            return { success: true }
        } else {
            return { success: false, error: 'Copy command failed' }
        }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error occurred'
        }
    }
}

/**
 * Modern clipboard API method for secure contexts
 */
async function copyTextModern(text: string): Promise<ClipboardResult> {
    try {
        await navigator.clipboard.writeText(text)
        return { success: true }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Clipboard API failed'
        }
    }
}

/**
 * Main clipboard copy function with automatic fallback
 */
export async function copyToClipboard(text: string): Promise<ClipboardResult> {
    if (!text) {
        return { success: false, error: 'No text provided' }
    }

    // Try modern API first if available
    if (isClipboardApiAvailable()) {
        const result = await copyTextModern(text)
        if (result.success) {
            return result
        }
        // If modern API fails, fall back to legacy method
    }

    // Use fallback method
    return copyTextFallback(text)
}

/**
 * Check if clipboard functionality is available at all
 */
export function isClipboardSupported(): boolean {
    return isClipboardApiAvailable() ||
        (typeof document !== 'undefined' &&
            typeof document.execCommand === 'function')
}
