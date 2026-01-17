import React, { useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Dashboard, Widget } from '../../types/dashboard.types';
import { WidgetRenderer } from '../WidgetRenderer';
import { useRealTimeDashboard } from '../../hooks/useRealTimeDashboard'; // Assuming this exists from previous step

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
    dashboard: Dashboard;
    isEditing?: boolean;
    onLayoutChange?: (layout: any) => void;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
    dashboard,
    isEditing = false,
    onLayoutChange
}) => {
    // Connect to real-time updates for this dashboard
    const { socket } = useRealTimeDashboard(dashboard.id);

    // Generate layout for react-grid-layout
    const layouts = useMemo(() => {
        if (!dashboard.widgets) return { lg: [] };

        const lgLayout = dashboard.widgets.map(widget => ({
            i: widget.id,
            x: widget.position.x,
            y: widget.position.y,
            w: widget.position.w,
            h: widget.position.h,
            minW: widget.position.minW || 2,
            minH: widget.position.minH || 2,
            static: !isEditing // Widgets are static when not editing
        }));

        return { lg: lgLayout };
    }, [dashboard.widgets, isEditing]);

    const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
        if (onLayoutChange) {
            onLayoutChange(currentLayout);
        }
    };

    if (!dashboard.widgets || dashboard.widgets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-gray-400 text-lg mb-2">No widgets yet</div>
                {isEditing && (
                    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                        Add Your First Widget
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="dashboard-grid-container">
            <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={dashboard.layoutConfig.rows === 'auto' ? 100 : (dashboard.layoutConfig.rows as number) || 100}
                margin={[dashboard.layoutConfig.gap || 16, dashboard.layoutConfig.gap || 16]}
                containerPadding={[dashboard.layoutConfig.padding || 16, dashboard.layoutConfig.padding || 16]}
                isDraggable={isEditing}
                isResizable={isEditing}
                onLayoutChange={handleLayoutChange}
                draggableHandle=".widget-header"
            >
                {dashboard.widgets.map(widget => (
                    <div key={widget.id} className="h-full">
                        <WidgetRenderer
                            widget={widget}
                            socket={socket}
                            isEditing={isEditing}
                        />
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
};
