# Clipboard Service with HTTP/HTTPS Fallback Support

**Date:** 29-07-25 18:34  
**Feature:** Clipboard service with HTTP/HTTPS fallback support for CopyToClipboard component functionality across all deployment environments

## Overview

Implemented a robust clipboard service that provides fallback support for non-HTTPS environments, ensuring the CopyToClipboard component works reliably across all deployment scenarios including HTTP-only domains.

## Problem Statement

The existing CopyToClipboard component relied solely on the modern `navigator.clipboard.writeText()` API, which requires a secure context (HTTPS) to function. When the application was served over HTTP, clipboard functionality would fail silently, providing a poor user experience.

## Solution Architecture

### 1. Clipboard Utility Service (`ui/src/services/clipboard/index.ts`)

Created a centralized clipboard service with the following features:

- **Automatic Detection**: Detects if the Clipboard API is available (secure context check)
- **Primary Method**: Uses `navigator.clipboard.writeText()` for HTTPS environments
- **Fallback Method**: Uses legacy `document.execCommand('copy')` for HTTP environments
- **Error Handling**: Comprehensive error handling with detailed error messages
- **Type Safety**: Full TypeScript support with proper interfaces

#### Key Functions:

```typescript
export interface ClipboardResult {
    success: boolean
    error?: string
}

export async function copyToClipboard(text: string): Promise<ClipboardResult>
export function isClipboardSupported(): boolean
```

### 2. Enhanced CopyToClipboard Component

Updated the existing component to:

- Use the new clipboard service instead of direct API calls
- Support optional toast notifications via `showToast` prop
- Integrate with the existing `useUI()` toast system
- Maintain backward compatibility with existing usage

#### New Props:

```typescript
interface Props {
    text: string
    showToast?: boolean  // New optional prop
}
```

### 3. Updated Existing Components

Modified components that used direct clipboard API calls:

- **CreateApiKeyDialog**: Updated to use new service with toast notifications
- **CalibratePromptDialog**: Updated to use new service with toast notifications
- **CreateUserDialog**: Enabled toast notifications for invitation link copying

## Implementation Details

### Fallback Strategy

The service implements a graceful degradation strategy:

1. **Primary**: Attempt to use modern Clipboard API if available
2. **Fallback**: If modern API fails or unavailable, use `document.execCommand('copy')`
3. **Error Handling**: Provide clear error messages for debugging

### Legacy Method Implementation

The fallback method creates a temporary textarea element:

```typescript
function copyTextFallback(text: string): ClipboardResult {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-999999px'
    textarea.style.top = '-999999px'
    textarea.setAttribute('readonly', '')
    
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, 99999)
    
    const successful = document.execCommand('copy')
    document.body.removeChild(textarea)
    
    return { success: successful }
}
```

## Testing

Created a comprehensive test page (`clipboard-test.html`) that:

- Displays environment information (protocol, API availability)
- Tests clipboard functionality with both methods
- Provides visual feedback for success/failure
- Allows testing paste functionality

## Benefits

1. **Universal Compatibility**: Works on both HTTP and HTTPS domains
2. **Improved UX**: Clear feedback when copy succeeds or fails
3. **Maintainability**: Centralized clipboard logic
4. **Future-proof**: Easy to extend with additional fallback methods
5. **Type Safety**: Full TypeScript support throughout

## Usage Examples

### Basic Usage (Silent)
```vue
<CopyToClipboard :text="someText" />
```

### With Toast Notifications
```vue
<CopyToClipboard :text="someText" :show-toast="true" />
```

### Programmatic Usage
```typescript
import { copyToClipboard } from '@/services/clipboard'

const result = await copyToClipboard('Hello World')
if (result.success) {
    // Handle success
} else {
    // Handle error: result.error
}
```

## Files Modified

- `ui/src/services/clipboard/index.ts` (new)
- `ui/src/components/ui/copy-to-clipboard/CopyToClipboard.vue`
- `ui/src/components/settings/CreateApiKeyDialog.vue`
- `ui/src/components/prompts/CalibratePromptDialog.vue`
- `ui/src/components/settings/CreateUserDialog.vue`
- `clipboard-test.html` (test file)

## Technical Considerations

- The service gracefully handles environments where neither API is available
- Memory cleanup is properly handled for temporary DOM elements
- Error messages are user-friendly and actionable
- The implementation follows existing code patterns and architecture

This implementation ensures that clipboard functionality works reliably across all deployment environments while maintaining a consistent user experience and providing clear feedback when operations succeed or fail.
