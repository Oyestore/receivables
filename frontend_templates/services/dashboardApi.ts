// API Service for Dashboard Operations
// frontend/src/services/dashboardApi.ts

import axios from 'axios';
import { Dashboard, Widget, DashboardListResponse, WidgetDataResponse } from '../types/dashboard.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/analytics`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Dashboard Operations
export const createDashboard = async (data: Partial<Dashboard>): Promise<Dashboard> => {
    const response = await api.post('/dashboards', data);
    return response.data;
};

export const listDashboards = async (params?: {
    status?: string;
    visibility?: string;
    limit?: number;
    offset?: number;
}): Promise<DashboardListResponse> => {
    const response = await api.get('/dashboards', { params });
    return response.data;
};

export const getDashboard = async (dashboardId: string): Promise<Dashboard> => {
    const response = await api.get(`/dashboards/${dashboardId}`);
    return response.data;
};

export const updateDashboard = async (
    dashboardId: string,
    updates: Partial<Dashboard>
): Promise<Dashboard> => {
    const response = await api.patch(`/dashboards/${dashboardId}`, updates);
    return response.data;
};

export const deleteDashboard = async (dashboardId: string): Promise<void> => {
    await api.delete(`/dashboards/${dashboardId}`);
};

export const duplicateDashboard = async (
    dashboardId: string,
    newName: string
): Promise<Dashboard> => {
    const response = await api.post(`/dashboards/${dashboardId}/duplicate`, { name: newName });
    return response.data;
};

export const shareDashboard = async (
    dashboardId: string,
    shareWith: any[]
): Promise<Dashboard> => {
    const response = await api.post(`/dashboards/${dashboardId}/share`, { sharedWith: shareWith });
    return response.data;
};

// Widget Operations
export const addWidget = async (
    dashboardId: string,
    widgetData: Partial<Widget>
): Promise<Widget> => {
    const response = await api.post(`/dashboards/${dashboardId}/widgets`, widgetData);
    return response.data;
};

export const updateWidget = async (
    dashboardId: string,
    widgetId: string,
    updates: Partial<Widget>
): Promise<Widget> => {
    const response = await api.patch(
        `/dashboards/${dashboardId}/widgets/${widgetId}`,
        updates
    );
    return response.data;
};

export const deleteWidget = async (dashboardId: string, widgetId: string): Promise<void> => {
    await api.delete(`/dashboards/${dashboardId}/widgets/${widgetId}`);
};

export const getWidgetData = async (
    dashboardId: string,
    widgetId: string,
    options?: { bypassCache?: boolean; filters?: any; parameters?: any }
): Promise<WidgetDataResponse> => {
    const response = await api.post(
        `/dashboards/${dashboardId}/widgets/${widgetId}/data`,
        options || {}
    );
    return response.data;
};

export const refreshWidget = async (
    dashboardId: string,
    widgetId: string
): Promise<WidgetDataResponse> => {
    const response = await api.post(`/dashboards/${dashboardId}/widgets/${widgetId}/refresh`);
    return response.data;
};
