import React from 'react';
import { Widget } from '../../../types/dashboard.types';

interface KPICardProps {
    widget: Widget;
    data: any;
}

const KPICard: React.FC<KPICardProps> = ({ widget, data }) => {
    const { kpiOptions } = widget.widgetConfig;

    // Extract value from data (assuming data is object or array with single item)
    let displayValue = '0';

    if (data) {
        if (typeof data === 'number' || typeof data === 'string') {
            displayValue = String(data);
        } else if (Array.isArray(data) && data.length > 0) {
            displayValue = data[0].value || data[0].count || JSON.stringify(data[0]);
        } else if (typeof data === 'object') {
            displayValue = data.value || data.count || '0';
        }
    }

    const { unit = '', icon, trend, trendValue } = kpiOptions || {};

    // Determine trend color
    const getTrendColor = () => {
        if (!trend) return 'text-gray-500';
        if (trend === 'up') return 'text-green-500';
        if (trend === 'down') return 'text-red-500';
        return 'text-gray-500';
    };

    const getTrendIcon = () => {
        if (trend === 'up') return '↑';
        if (trend === 'down') return '↓';
        return '→';
    };

    return (
        <div className="h-full flex flex-col justify-center">
            <div className="flex items-end justify-between mb-2">
                <div className="text-3xl font-bold text-gray-900">
                    {unit}{displayValue}
                </div>
                {icon && (
                    <div className="text-2xl text-gray-400 opacity-50">
                        {/* Icon placeholder - would use an icon library like lucide-react */}
                        <span className={`icon-${icon}`}></span>
                    </div>
                )}
            </div>

            {trend && (
                <div className={`flex items-center text-sm font-medium ${getTrendColor()}`}>
                    <span className="mr-1">{getTrendIcon()}</span>
                    {trendValue && <span>{Math.abs(trendValue)}%</span>}
                    <span className="ml-1 text-gray-400 font-normal">vs last period</span>
                </div>
            )}

            {widget.description && (
                <div className="mt-2 text-xs text-gray-400 truncate">
                    {widget.description}
                </div>
            )}
        </div>
    );
};

export default KPICard;
