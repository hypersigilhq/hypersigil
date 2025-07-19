# Prompt Calibration Summarize Switch

## Overview
Added a switch widget to the CalibratePromptDialog component that allows users to toggle the "summarize" parameter for the generateAdjustment method. The switch automatically refreshes the adjustment when toggled.

## Implementation Details

### UI Components
- **Switch Widget**: Added a toggle switch in the dialog header area with proper labeling
- **Automatic Refresh**: The adjustment is automatically regenerated when the switch is toggled
- **State Management**: Uses Vue 3 reactive state to manage the summarize parameter

### Technical Implementation
1. **Switch Component**: Imported and used the existing Switch component from `@/components/ui/switch`
2. **State Variable**: Added `summarize` reactive reference with default value of `false`
3. **API Integration**: Updated the `generateAdjustment` method to include the summarize parameter in the API call
4. **Watchers**: Added a watcher for the summarize state that automatically triggers adjustment regeneration

### User Experience
- **Intuitive Control**: Users can easily toggle between summarized and detailed comment processing
- **Real-time Updates**: Changes are applied immediately without requiring manual refresh
- **Clear Labeling**: The switch is clearly labeled as "Summarize comments"
- **Consistent Design**: Follows the existing design patterns and UI components

### Code Changes
- **Template**: Added Switch component with proper binding and labeling in the DialogHeader
- **Script**: Added summarize state variable, updated generateAdjustment method, and added watcher
- **Imports**: Added Switch component import

## Benefits
- **Enhanced User Control**: Users can choose between detailed and summarized comment processing
- **Improved Workflow**: Automatic refresh eliminates the need for manual regeneration
- **Better UX**: Seamless integration with existing dialog functionality
- **Type Safety**: Leverages existing TypeScript definitions for the API

## Usage
1. Open the Calibrate Prompt dialog from the ViewPromptDialog
2. Use the "Summarize comments" switch to toggle between modes
3. The adjustment prompt is automatically regenerated when the switch is toggled
4. The summarize parameter is passed to the backend generateAdjustment API
