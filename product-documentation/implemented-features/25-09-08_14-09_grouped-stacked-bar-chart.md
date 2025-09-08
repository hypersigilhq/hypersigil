# Grouped Stacked Bar Chart with Input/Output Token Distinction

## Overview
Implemented a comprehensive grouped stacked bar chart system for the dashboard that displays token usage by provider and model with separate input and output token visualization.

## Features Implemented

### 1. New API Endpoints
- **Daily Grouped Endpoint**: `GET /api/v1/dashboard/token-usage/daily/grouped`
- **Hourly Grouped Endpoint**: `GET /api/v1/dashboard/token-usage/hourly/grouped`
- **Data Structure**: Returns time-series data grouped by provider and model with separate input/output token counts

### 2. Backend Implementation
- **Location**: `backend/src/models/execution.ts`
- **New Methods**:
  - `getDailyTokenUsageByProviderModel()` - Aggregates daily data by provider/model
  - `getHourlyTokenUsageByProviderModel()` - Aggregates hourly data by provider/model
- **Database Queries**: Complex GROUP BY queries with proper date filtering and token aggregation

### 3. Chart Component
- **Location**: `ui/src/components/ui/chartjs-grouped-stacked-bar-chart.vue`
- **Technology**: Chart.js with Vue 3 Composition API
- **Features**:
  - **Grouping Switch**: Three modes (None, Provider, Provider+Model)
  - **Token Type Toggle**: Switch between input/output breakdown and total tokens
  - **Provider Filter**: Multi-select filter to show/hide specific providers
  - Grouped bars by time period (day/hour)
  - Stacked bars within each group showing provider usage
  - Separate input/output token distinction with color coding
  - Interactive tooltips with detailed breakdowns
  - Responsive design with proper accessibility
  - Dynamic chart options based on grouping mode

### 4. Dashboard Integration
- **Location**: `ui/src/views/DashboardView.vue`
- **Features**:
  - Replaced simple bar charts with grouped stacked bar charts
  - Dynamic data transformation for chart consumption
  - Updated chart titles and descriptions
  - Maintained existing date range filtering

## Technical Implementation

### Chart Structure
```
Time Period (X-axis)
├── Provider 1
│   ├── Model A Input Tokens  (Green)
│   ├── Model A Output Tokens (Blue)
│   ├── Model B Input Tokens  (Green)
│   └── Model B Output Tokens (Blue)
├── Provider 2
│   ├── Model C Input Tokens  (Green)
│   └── Model C Output Tokens (Blue)
└── Provider 3...
```

### Data Flow
1. **API Call**: Frontend requests grouped data from new endpoints
2. **Data Transformation**: Raw API data transformed into chart-compatible format
3. **Chart Rendering**: Chart.js renders grouped stacked bars with proper stacking
4. **User Interaction**: Tooltips show detailed breakdowns on hover

### Color Scheme
- **Input Tokens**: `hsl(120, 60%, 60%)` (Green)
- **Output Tokens**: `hsl(240, 60%, 60%)` (Blue)
- **Provider Colors**: Dynamic color assignment for provider identification

## Files Modified/Created

### New Files
- `ui/src/components/ui/chartjs-grouped-stacked-bar-chart.vue` - Main chart component
- `product-documentation/implemented-features/25-09-08_14-09_grouped-stacked-bar-chart.md` - This documentation

### Modified Files
- `backend/src/api/definitions/dashboard.ts` - Added new API schemas and endpoints
- `backend/src/models/execution.ts` - Added new model methods for grouped data
- `backend/src/api/handlers/dashboard.ts` - Added new endpoint handlers
- `ui/src/services/api-client/dashboard.ts` - Added new API client methods
- `ui/src/views/DashboardView.vue` - Integrated new chart component
- `product-documentation/TASK_LIST.md` - Updated with completion status

## API Changes

### New Endpoints
```typescript
GET /api/v1/dashboard/token-usage/daily/grouped?startDate=...&endDate=...
GET /api/v1/dashboard/token-usage/hourly/grouped?startDate=...&endDate=...
```

### Response Format
```typescript
interface GroupedTokenUsage {
    date?: string;        // For daily charts
    hour?: number;        // For hourly charts
    provider: string;
    model: string;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    executionCount: number;
}
```

## User Experience

### Chart Visualization
- **Grouped Display**: Each time period shows multiple bars (one per provider)
- **Stacked Bars**: Each provider bar is stacked with input/output tokens for each model
- **Color Coding**: Clear distinction between input (green) and output (blue) tokens
- **Interactive Tooltips**: Hover shows detailed breakdown by provider/model/token type

### Performance
- Efficient data aggregation at database level
- Parallel API calls for multiple data sources
- Optimized Chart.js rendering with proper data structures
- Responsive updates on date range changes

## Technical Details

### Database Queries
```sql
SELECT
    DATE(completed_at) as date,
    provider,
    model,
    SUM(input_tokens_used) as inputTokens,
    SUM(output_tokens_used) as outputTokens,
    COUNT(*) as executionCount
FROM executions
WHERE status = 'completed'
    AND completed_at IS NOT NULL
    AND completed_at >= ? AND completed_at <= ?
GROUP BY DATE(completed_at), provider, model
ORDER BY date DESC, provider, model
```

### Chart.js Configuration
- **Type**: Bar chart with stacking enabled
- **Scales**: X-axis grouped, Y-axis stacked
- **Interaction**: Index-based hover with detailed tooltips
- **Responsive**: Maintains aspect ratio and readability

## Benefits

### Enhanced Analytics
- **Provider Comparison**: Easy visual comparison between providers
- **Model Performance**: Clear view of which models consume most tokens
- **Input vs Output Analysis**: Understand token consumption patterns
- **Time-based Trends**: Track usage patterns over time

### Improved Decision Making
- **Cost Optimization**: Identify high-cost provider/model combinations
- **Resource Planning**: Plan capacity based on usage patterns
- **Performance Monitoring**: Track model efficiency (input vs output ratios)

## Future Enhancements
- Toggle between input/output view and total tokens view
- Export chart data to CSV/PDF
- Drill-down functionality for detailed model analysis
- Custom color schemes for specific providers
- Advanced filtering options (by provider, model type, etc.)

## Testing
- Component renders correctly with various data sets
- Chart updates properly on data changes
- Tooltips display accurate information
- Responsive design works on different screen sizes
- Error handling for empty data sets

## Accessibility
- Proper ARIA labels for chart elements
- Keyboard navigation support
- Screen reader compatible tooltips
- High contrast color schemes
- Focus management for interactive elements

## Performance Impact
- Additional database queries for grouped data
- Increased payload size for detailed breakdowns
- Chart.js rendering overhead for complex visualizations
- Overall acceptable performance with proper optimization

## Integration Notes
- Backward compatible with existing dashboard functionality
- No breaking changes to existing API endpoints
- Maintains existing date range filtering capabilities
- Works seamlessly with existing UI components and styling
