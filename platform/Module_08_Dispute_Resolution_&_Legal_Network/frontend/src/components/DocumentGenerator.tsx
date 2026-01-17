import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Button, Grid, Select, MenuItem, FormControl, InputLabel, TextField, Box, CircularProgress, Alert } from '@mui/material';
import api from '../services/api';

interface Template {
    id: string;
    name: string;
    type: string;
    description: string;
    variables: Array<{ name: string; required: boolean; label: string }>;
}

const DocumentGenerator = ({ disputeId, tenantId }: { disputeId: string; tenantId: string }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [generating, setGenerating] = useState(false);
    const [generatedDoc, setGeneratedDoc] = useState<{ url: string; id: string } | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await api.get('/api/v1/documents/templates');
                setTemplates(response.data.data || []);
            } catch (err) {
                console.error('Failed to load templates', err);
                setError('Failed to load document templates');
            }
        };
        fetchTemplates();
    }, []);

    const handleGenerate = async () => {
        if (!selectedTemplate) return;
        setGenerating(true);
        setError('');
        try {
            const response = await api.post('/api/v1/documents/generate', {
                templateId: selectedTemplate,
                disputeCaseId: disputeId,
                tenantId,
                variables
            });
            setGeneratedDoc({
                id: response.data.data.documentId,
                url: response.data.data.filePath // In real app, this would be a signed URL
            });
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to generate document');
        } finally {
            setGenerating(false);
        }
    };

    const currentTemplate = templates.find(t => t.id === selectedTemplate);

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" gutterBottom>Legal Document Generator</Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Select Document Template</InputLabel>
                            <Select
                                value={selectedTemplate}
                                label="Select Document Template"
                                onChange={(e) => {
                                    setSelectedTemplate(e.target.value);
                                    setVariables({}); // Reset vars on template change
                                }}
                            >
                                {templates.map(t => (
                                    <MenuItem key={t.id} value={t.id}>{t.name} ({t.type})</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {currentTemplate && currentTemplate.variables.map(variable => (
                        <Grid item xs={12} md={6} key={variable.name}>
                            <TextField
                                fullWidth
                                label={variable.label || variable.name}
                                required={variable.required}
                                value={variables[variable.name] || ''}
                                onChange={(e) => setVariables({ ...variables, [variable.name]: e.target.value })}
                            />
                        </Grid>
                    ))}

                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleGenerate}
                            disabled={generating || !selectedTemplate}
                            fullWidth
                        >
                            {generating ? <CircularProgress size={24} /> : 'Generate Document'}
                        </Button>
                    </Grid>

                    {generatedDoc && (
                        <Grid item xs={12}>
                            <Alert severity="success">
                                Document successfully generated!
                                <Button href={generatedDoc.url} target="_blank" size="small" sx={{ ml: 2 }}>
                                    View Document
                                </Button>
                            </Alert>
                        </Grid>
                    )}
                </Grid>
            </CardContent>
        </Card>
    );
};

export default DocumentGenerator;
