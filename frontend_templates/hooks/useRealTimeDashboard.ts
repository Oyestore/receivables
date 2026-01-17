import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export function useRealTimeDashboard(dashboardId: string) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [widgetData, setWidgetData] = useState<Map<string, any>>(new Map());
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');

    useEffect(() => {
        // Connect to dashboard WebSocket
        // In a real app, URL would come from env config
        const newSocket = io('http://localhost:3000/dashboard', {
            query: {
                // In a real app, these would come from auth context
                tenantId: 'default-tenant',
                userId: 'default-user'
            }
        });

        // Connection established
        newSocket.on('connection:established', (data) => {
            console.log('Connected:', data);
            setConnectionStatus('connected');
        });

        // Subscribe to dashboard
        newSocket.emit('dashboard:subscribe', { dashboardId });

        // Listen for widget data updates
        newSocket.on('widget:data:update', (payload) => {
            const { widgetId, data, timestamp } = payload;
            setWidgetData(prev => new Map(prev).set(widgetId, { data, timestamp }));
        });

        // Listen for widget errors
        newSocket.on('widget:error', (payload) => {
            console.error('Widget error:', payload);
        });

        // Handle filter changes
        newSocket.on('dashboard:filter:changed', (payload) => {
            console.log('Filters changed:', payload.filters);
        });

        setSocket(newSocket);

        // Cleanup
        return () => {
            newSocket.emit('dashboard:unsubscribe', { dashboardId });
            newSocket.close();
        };
    }, [dashboardId]);

    const subscribeToWidget = (widgetId: string) => {
        socket?.emit('widget:subscribe', { widgetId });
    };

    const unsubscribeFromWidget = (widgetId: string) => {
        socket?.emit('widget:unsubscribe', { widgetId });
    };

    const refreshWidget = (widgetId: string) => {
        socket?.emit('widget:refresh', { widgetId });
    };

    const changeFilter = (filters: any) => {
        socket?.emit('dashboard:filter:change', { dashboardId, filters });
    };

    return {
        socket,
        widgetData,
        connectionStatus,
        subscribeToWidget,
        unsubscribeFromWidget,
        refreshWidget,
        changeFilter
    };
}
