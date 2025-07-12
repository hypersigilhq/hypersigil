# Test Data Item Scheduling Feature

## Overview
This feature allows users to schedule executions for individual test data items directly from the Test Data Items view. Users can select a specific test data item and schedule it to run against any available prompt with customizable execution options.

## Implementation Details

### Backend Changes

#### 1. Prompt Select List API
- **File**: `backend/src/api/definitions/prompt.ts`
- **Addition**: Added `PromptSelectListSchema` and `selectList` endpoint
- **Purpose**: Provides a lightweight API for fetching prompt options for dropdowns

#### 2. Prompt Handler Enhancement
- **File**: `backend/src/api/handlers/prompt.ts`
- **Addition**: Implemented `selectList` handler that returns id/name pairs for all prompts
- **Purpose**: Efficient prompt loading for selection interfaces

#### 3. API Client Update
- **File**: `ui/src/services/api-client.ts`
- **Addition**: Added `promptsApi.selectList()` method
- **Purpose**: Frontend access to the new prompt selection endpoint

### Frontend Changes

#### 1. Test Data Items Table Enhancement
- **File**: `ui/src/components/test-data/TestDataItemsTable.vue`
- **Changes**:
  - Added "Schedule" action button (Play icon) to each row
  - Imported and integrated `ScheduleExecutionDialog` component
  - Added state management for schedule dialog
  - Implemented `scheduleItem()` function to open dialog with pre-filled data

#### 2. Schedule Execution Dialog Extension
- **File**: `ui/src/components/executions/ScheduleExecutionDialog.vue`
- **Changes**:
  - Added `mode` prop to support 'group' vs 'item' modes
  - Added `initialUserInput` prop for pre-filling content
  - Added prompt selection functionality for item mode
  - Conditional rendering based on mode:
    - Item mode: Shows prompt selection (required) + pre-filled user input
    - Group mode: Shows test data group selection (original behavior)
  - Enhanced form logic to handle different execution scenarios

## User Experience

### Workflow
1. User navigates to Test Data Items view for a specific group
2. User clicks the "Schedule" button (Play icon) for any test data item
3. Schedule Execution Dialog opens in "item mode" with:
   - Prompt selection dropdown (required)
   - User input pre-filled with the test data item's content
   - Provider/model selection (multiple)
   - Execution options (temperature, max tokens, etc.)
4. User selects a prompt and configures execution settings
5. User clicks "Schedule Execution" to create the execution
6. System creates execution with the selected prompt and test data item content

### Key Features
- **Pre-filled Content**: Test data item content is automatically populated in the user input field
- **Prompt Selection**: Users can choose from any available prompt in the system
- **Execution Options**: Full access to all execution configuration options
- **Consistent UI**: Reuses existing ScheduleExecutionDialog with mode-specific behavior
- **Type Safety**: Leverages existing TypeScript types and API definitions

## Technical Architecture

### Mode-Based Rendering
The ScheduleExecutionDialog now supports two modes:
- **Group Mode** (default): Original behavior for scheduling against test data groups
- **Item Mode**: New behavior for scheduling individual items against selected prompts

### Data Flow
1. TestDataItemsTable → scheduleItem() → opens dialog with item data
2. ScheduleExecutionDialog loads prompts via promptsApi.selectList()
3. User selects prompt and configures execution
4. Dialog submits execution with:
   - `promptId`: Selected prompt ID
   - `userInput`: Test data item content
   - `providerModel`: Selected models
   - `options`: Execution configuration

### API Integration
- Reuses existing execution creation API (`executionsApi.create()`)
- Leverages new prompt selection API for efficient dropdown loading
- Maintains compatibility with existing execution infrastructure

## Benefits
1. **Granular Control**: Users can test individual data items against specific prompts
2. **Flexible Testing**: Enables targeted testing scenarios beyond group-based execution
3. **Efficient Workflow**: Direct access from test data items view
4. **Consistent Experience**: Familiar interface with existing execution scheduling
5. **Scalable Architecture**: Clean separation of concerns with mode-based behavior

## Future Enhancements
- Batch selection of multiple test data items for scheduling
- Quick prompt selection based on recent usage
- Execution templates for common configurations
- Integration with execution result analysis tools
