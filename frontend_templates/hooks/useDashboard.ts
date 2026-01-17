// Custom React Hook for Dashboard Management
// frontend/src/hooks/useDashboard.ts

import { useState, useEffect, useCallback } from 'react';
import { Dashboard, Widget, WidgetDataResponse } from '../types/dashboard.types';
import * as dashboardApi from '../services/dashboardApi';

export function useDashboard(dashboardId: string | null) {
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Fetch dashboard
    const fetchDashboard = useCallback(async () => {
        if (!dashboardId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await dashboardApi.getDashboard(dashboardId);
            setDashboard(data);
            setWidgets(data.widgets || []);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [dashboardId]);

    // Update dashboard
    const updateDashboard = useCallback(async (updates: Partial<Dashboard>) => {
        if (!dashboardId) return;

        try {
            const updated = await dashboardApi.updateDashboard(dashboardId, updates);
            setDashboard(updated);
            return updated;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [dashboardId]);

    // Add widget
    const addWidget = useCallback(async (widgetData: Partial<Widget>) => {
        if (!dashboardId) return;

        try {
            const widget = await dashboardApi.addWidget(dashboardId, widgetData);
            setWidgets(prev => [...prev, widget]);
            return widget;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [dashboardId]);

    // Update widget
    const updateWidget = useCallback(async (widgetId: string, updates: Partial<Widget>) => {
        if (!dashboardId) return;

        try {
            const widget = await dashboardApi.updateWidget(dashboardId, widgetId, updates);
            setWidgets(prev => prev.map(w => w.id === widgetId ? widget : w));
            return widget;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [dashboardId]);

    // Delete widget
    const deleteWidget = useCallback(async (widgetId: string) => {
        if (!dashboardId) return;

        try {
            await dashboardApi.deleteWidget(dashboardId, widgetId);
            setWidgets(prev => prev.filter(w => w.id !== widgetId));
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [dashboardId]);

    // Load on mount
    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    return {
        dashboard,
        widgets,
        loading,
        error,
        refresh: fetchDashboard,
        updateDashboard,
        addWidget,
        updateWidget,
        deleteWidget,
    };
}

// Hook for managing widget data
export function useWidgetData(dashboardId: string, widgetId: string) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

    const fetchData = useCallback(async (bypassCache = false) => {
        setLoading(true);
        setError(null);

        try {
            const response: WidgetDataResponse = await dashboardApi.getWidgetData(
                dashboardId,
                widgetId,
                { bypassCache }
            );

            setData(response.data);
            setFetchedAt(new Date(response.fetchedAt));
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [dashboardId, widgetId]);

    const refresh = useCallback(() => {
        return fetchData(true);
    }, [fetchData]);

    // Initial load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        loading,
        error,
        fetchedAt,
        refresh,
    };
}

// Hook for real-time widget data  
export function useRealTimeWidgetData(
    dashboardId: string,
    widgetId: string,
    socket: any // Socket.IO instance
) {
    const [data, setData] = useState<any>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;

        // Subscribe to widget
        socket.emit('widget:subscribe', { widgetId });

        // Listen for data updates
        const handleDataUpdate = (payload: any) => {
            if (payload.widgetId === widgetId) {
                setData(payload.data);
                setLastUpdate(new Date(payload.timestamp));
                setError(null);
            }
        };

        // Listen for errors
        const handleError = (payload: any) => {
            if (payload.widgetId === widgetId) {
                setError(payload.error.message);
            }
        };

        socket.on('widget:data:update', handleDataUpdate);
        socket.on('widget:error', handleError);

        // Cleanup
        return () => {
            socket.emit('widget:unsubscribe', { widgetId });
            socket.off('widget:data:update', handleDataUpdate);
            socket.off('widget:error', handleError);
        };
    }, [socket, widgetId]);

    const refreshWidget = useCallback(() => {
        if (socket) {
            socket.emit('widget:refresh', { widgetId });
        }
    }, [socket, widgetId]);

    return {
        data,
        lastUpdate,
        error,
        refresh: refreshWidget,
    };
}
