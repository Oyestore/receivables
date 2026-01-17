import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const getTemplates = async (params: { organizationId?: string, status?: string }) => {
    const response = await axios.get(`${API_URL}/templates`, { params });
    return response.data;
};

export const getRecommendedTemplates = async (industry: string) => {
    const response = await axios.get(`${API_URL}/templates/recommended`, { params: { industry } });
    return response.data;
};

export const createTemplate = async (data: any) => {
    const response = await axios.post(`${API_URL}/templates`, data);
    return response.data;
};

export const updateTemplate = async (id: string, data: any) => {
    const response = await axios.put(`${API_URL}/templates/${id}`, data);
    return response.data;
};

export const deleteTemplate = async (id: string) => {
    const response = await axios.delete(`${API_URL}/templates/${id}`);
    return response.data;
};

export const getTemplateDetails = async (id: string) => {
    const response = await axios.get(`${API_URL}/templates/${id}`);
    return response.data;
};

export const setDefaultTemplate = async (id: string) => {
    const response = await axios.post(`${API_URL}/templates/${id}/set-default`);
    return response.data;
};
