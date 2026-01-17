import React, { Suspense } from 'react';
import { Widget, WidgetType } from '../../types/dashboard.types';
import { useWidgetData, useRealTimeWidgetData } from '../../hooks/useDashboard';

// Lazy load widget components to optimize bundle size
const LineChart = React.lazy(() => import('./Widgets/Charts/LineChart'));
const BarChart = React.lazy(() => import('./Widgets/Charts/BarChart'));
const PieChart = React.lazy(() => import('./Widgets/Charts/PieChart'));
const KPICard = React.lazy(() => import('./Widgets/Data/KPICard'));
const DataTable = React.lazy(() => import('./Widgets/Data/DataTable'));
const AlertPanel = React.lazy(() => import('./Widgets/Data/AlertPanel'));

interface WidgetRendererProps {
    widget: Widget;
    socket?: any; // Socket.IO instance
    isEditing?: boolean;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
    widget,
    socket,
    isEditing = false
}) => {
    // Determine which hook to use based on data source
    const isRealTime = widget.dataSourceType === 'REAL_TIME_STREAM';

    // Conditionally use hooks (Note: In a real app, this needs careful handling 
    // or a wrapper component to avoid hook rules violations. 
    // Here we assume a wrapper or consistent usage)
    const staticData = useWidgetData(widget.dashboardId, widget.id);
    const realTimeData = useRealTimeWidgetData(widget.dashboardId, widget.id, socket);

    const { data, loading, error } = isRealTime ? realTimeData : staticData;

    // Loading state
    if (loading && !data) {
        return (
            <div className="widget-loading h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="widget-error h-full flex flex-col items-center justify-center text-red-500 p-4">
                <span className="icon-alert mb-2">⚠️</span>
                <p className="text-sm text-center">{typeof error === 'string' ? error : error.message}</p>
            </div>
        );
    }

    const renderContent = () => {
        switch (widget.type) {
            case WidgetType.LINE_CHART:
                return <LineChart widget={widget} data={data} />;
            case WidgetType.BAR_CHART:
                return <BarChart widget={widget} data={data} />;
            case WidgetType.PIE_CHART:
                return <PieChart widget={widget} data={data} />;
            case WidgetType.KPI_CARD:
                return <KPICard widget={widget} data={data} />;
            case WidgetType.DATA_TABLE:
                return <DataTable widget={widget} data={data} />;
            case WidgetType.ALERT_PANEL:
                return <AlertPanel widget={widget} data={data} />;
            default:
                return (
                    <div className="p-4 text-gray-500">
                        Widget type {widget.type} not supported yet
                    </div>
                );
        }
    };

    return (
        <div className={`widget-container h-full flex flex-col bg-white rounded-lg shadow-sm overflow-hidden ${widget.styling?.customCss || ''}`}
            style={{
                backgroundColor: widget.styling?.backgroundColor,
                borderColor: widget.styling?.borderColor,
                borderWidth: widget.styling?.borderWidth,
            }}>

            {/* Widget Header */}
            <div className="widget-header px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-medium text-gray-800 truncate"
                    style={{ color: widget.styling?.textColor }}>
                    {widget.title}
                </h3>
                {isEditing && (
                    <div className="widget-actions">
                        {/* Edit controls would go here */}
                        <button className="text-gray-400 hover:text-blue-500">⚙️</button>
                    </div>
                )}
            </div>

            {/* Widget Content */}
            <div className="widget-content flex-1 min-h-0 relative p-4">
                <Suspense fallback={<div className="animate-pulse bg-gray-100 w-full h-full rounded"></div>}>
                    {renderContent()}
                </Suspense>
            </div>
        </div>
    );
};
