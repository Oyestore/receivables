import React from 'react';
import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Widget } from '../../../types/dashboard.types';

interface LineChartProps {
    widget: Widget;
    data: any[];
}

const LineChart: React.FC<LineChartProps> = ({ widget, data }) => {
    const { chartOptions } = widget.widgetConfig;

    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No data available
            </div>
        );
    }

    // Default options if not provided
    const xAxisField = chartOptions?.xAxis?.field || 'name';
    const yAxisField = chartOptions?.yAxis?.field || 'value';
    const colors = chartOptions?.colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartsLine data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />

                <XAxis
                    dataKey={xAxisField}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    dy={10}
                />

                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                />

                <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />

                {chartOptions?.legend !== false && (
                    <Legend verticalAlign="top" height={36} />
                )}

                {/* Support multiple series if defined, otherwise single series */}
                {chartOptions?.series ? (
                    // If series is a string (field name for grouping) or array of fields
                    Array.isArray(chartOptions.series) ? (
                        chartOptions.series.map((field: string, index: number) => (
                            <Line
                                key={field}
                                type="monotone"
                                dataKey={field}
                                stroke={colors[index % colors.length]}
                                strokeWidth={2}
                                dot={{ r: 3, strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                            />
                        ))
                    ) : (
                        <Line
                            type="monotone"
                            dataKey={yAxisField}
                            stroke={colors[0]}
                            strokeWidth={2}
                            dot={{ r: 3, strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                        />
                    )
                ) : (
                    <Line
                        type="monotone"
                        dataKey={yAxisField}
                        stroke={colors[0]}
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                    />
                )}
            </RechartsLine>
        </ResponsiveContainer>
    );
};

export default LineChart;
