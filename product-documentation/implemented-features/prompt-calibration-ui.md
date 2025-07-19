# Prompt Calibration UI Feature

## Overview
The Prompt Calibration UI feature allows users to generate adjustment suggestions for prompts based on selected comments. This feature integrates with the existing prompt adjustment service to provide a user-friendly interface for prompt optimization.

## Components

### CalibratePromptDialog.vue
A dedicated dialog component that handles the prompt calibration workflow:

**Props:**
- `open: boolean` - Controls dialog visibility
- `promptId: string | null` - ID of the prompt to calibrate
- `selectedCommentIds: string[]` - Array of selected comment IDs

**Features:**
- Automatically triggers adjustment generation when opened
- Displays loading state during API call
- Shows error messages if generation fails
- Side-by-side comparison of original and suggested adjustment prompts
- Copy to clipboard functionality for the adjustment prompt
- Responsive full-screen layout

**API Integration:**
- Uses `promptsApi.generateAdjustment()` to call the backend service
- Handles the `GenerateAdjustmentResponse` type from API definitions

### ViewPromptDialog.vue Updates
Enhanced the existing prompt viewing dialog with calibration functionality:

**New Features:**
- "Calibrate prompt" button that appears when comments are selected
- Integration with the CalibratePromptDialog component
- Computed properties to track selected comments and their IDs

**UI/UX Improvements:**
- Button positioned next to the comments count for easy access
- Only visible when at least one comment is selected
- Seamless integration with existing comment selection system

## User Workflow

1. **Open Prompt Dialog**: User opens a prompt in the ViewPromptDialog
2. **Select Comments**: User selects one or more comments using checkboxes
3. **Calibrate Button Appears**: "Calibrate prompt" button becomes visible
4. **Open Calibration Dialog**: User clicks the button to open CalibratePromptDialog
5. **Automatic Generation**: System automatically calls the adjustment API
6. **View Results**: User sees original prompt vs. suggested adjustment side-by-side
7. **Copy Adjustment**: User can copy the suggested adjustment to clipboard

## Technical Implementation

### API Client Integration
- Added `generateAdjustment` method to `promptsApi` in api-client.ts
- Proper error handling and type safety using TypeScript
- Integration with existing API definition system

### State Management
- Uses Vue 3 Composition API with reactive state
- Proper cleanup of state when dialogs close
- Computed properties for efficient reactivity

### UI Components
- Leverages existing shadcn/ui components for consistency
- Responsive design with proper overflow handling
- Loading states and error handling

### Type Safety
- Full TypeScript integration with API definitions
- Proper typing for all props, events, and state
- Leverages existing type definitions from the API layer

## Design Consistency
- Follows existing design patterns from other dialog components
- Uses consistent spacing, typography, and color scheme
- Maintains accessibility standards with proper ARIA labels
- Keyboard navigation support inherited from base dialog components

## Error Handling
- Graceful handling of API errors with user-friendly messages
- Validation of required props before API calls
- Proper loading states to indicate processing

## Future Enhancements
- Toast notifications for successful operations
- Ability to directly apply adjustments to create new prompt versions
- Batch processing of multiple comment sets
- Integration with prompt versioning system for automatic updates
