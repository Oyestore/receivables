import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Select,
    MenuItem,
    Button,
    Chip,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Grid,
    Alert,
    Tabs,
    Tab,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Save as SaveIcon,
    Preview as PreviewIcon,
    Send as SendIcon,
    Code as CodeIcon,
    FormatBold,
    FormatItalic,
    FormatUnderlined,
} from '@mui/icons-material';
import { Editor } from '@tinymce/tinymce-react';

interface TemplateEditorProps {
    templateId?: string;
    onSave?: (template: any) => void;
    onCancel?: () => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
    templateId,
    onSave,
    onCancel,
}) => {
    const [template, setTemplate] = useState({
        name: '',
        description: '',
        channel: 'email' as 'email' | 'sms' | 'whatsapp' | 'physical_mail',
        category: '',
        tags: [] as string[],
        content: {
            subject: '',
            body: '',
            variables: [] as string[],
            preheader: '',
        },
    });

    const [tab, setTab] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewData, setPreviewData] = useState({
        invoice_number: 'INV-2024-001',
        client_name: 'Acme Corporation',
        amount: '₹10,000',
        due_date: '2024-02-15',
        payment_link: 'https://pay.example.com/abc123',
    });

    const [renderedPreview, setRenderedPreview] = useState({ subject: '', body: '' });
    const [errors, setErrors] = useState<string[]>([]);

    // Available variables for insertion
    const availableVariables = [
        { name: 'invoice_number', description: 'Invoice number' },
        { name: 'client_name', description: 'Client name' },
        { name: 'amount', description: 'Invoice amount' },
        { name: 'due_date', description: 'Due date' },
        { name: 'payment_link', description: 'Payment link' },
        { name: 'company_name', description: 'Your company name' },
        { name: 'support_email', description: 'Support email' },
    ];

    useEffect(() => {
        if (templateId) {
            // Load existing template
            loadTemplate(templateId);
        }
    }, [templateId]);

    const loadTemplate = async (id: string) => {
        // API call to load template
        try {
            const response = await fetch(`/api/v1/distribution/templates/${id}`);
            const data = await response.json();
            setTemplate(data);
        } catch (error) {
            console.error('Failed to load template', error);
        }
    };

    const insertVariable = (variable: string) => {
        const variableTag = `{{${variable}}}`;

        if (tab === 0) {
            // Insert into subject
            setTemplate({
                ...template,
                content: {
                    ...template.content,
                    subject: template.content.subject + variableTag,
                },
            });
        } else {
            // Insert into body
            setTemplate({
                ...template,
                content: {
                    ...template.content,
                    body: template.content.body + variableTag,
                },
            });
        }

        // Add to variables list if not already there
        if (!template.content.variables.includes(variable)) {
            setTemplate({
                ...template,
                content: {
                    ...template.content,
                    variables: [...template.content.variables, variable],
                },
            });
        }
    };

    const handleSave = async () => {
        // Validate
        const validationErrors: string[] = [];
        if (!template.name) validationErrors.push('Template name is required');
        if (!template.content.body) validationErrors.push('Template body is required');
        if (template.channel === 'email' && !template.content.subject) {
            validationErrors.push('Email subject is required');
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        // Save template
        try {
            const response = await fetch('/api/v1/distribution/templates', {
                method: templateId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(template),
            });

            if (response.ok) {
                const saved = await response.json();
                onSave?.(saved);
            }
        } catch (error) {
            setErrors(['Failed to save template']);
        }
    };

    const handlePreview = async () => {
        try {
            const response = await fetch(`/api/v1/distribution/templates/${templateId}/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preview Data),
            });

            if (response.ok) {
                const rendered = await response.json();
                setRenderedPreview(rendered);
                setPreviewOpen(true);
            }
        } catch (error) {
            setErrors(['Failed to generate preview']);
        }
    };

    return (
        <Box>
            <Card
                elevation={0}
                sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    {/* Header */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h5" fontWeight={600}>
                            {templateId ? 'Edit Template' : 'Create Template'}
                        </Typography>
                        <Box display="flex" gap={1}>
                            <Button
                                variant="outlined"
                                startIcon={<PreviewIcon />}
                                onClick={handlePreview}
                                disabled={!template.content.body}
                            >
                                Preview
                            </Button>
                            <Button variant="outlined" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleSave}
                                sx={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #5568c3 0%, #653a8a 100%)',
                                    },
                                }}
                            >
                                Save Template
                            </Button>
                        </Box>
                    </Box>

                    {/* Errors */}
                    {errors.length > 0 && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrors([])}>
                            {errors.map((error, i) => (
                                <div key={i}>{error}</div>
                            ))}
                        </Alert>
                    )}

                    <Grid container spacing={3}>
                        {/* Left Panel - Template Settings */}
                        <Grid item xs={12} md={4}>
                            <Box display="flex" flexDirection="column" gap={2}>
                                <TextField
                                    fullWidth
                                    label="Template Name"
                                    value={template.name}
                                    onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                                    required
                                />

                                <TextField
                                    fullWidth
                                    label="Description"
                                    value={template.description}
                                    onChange={(e) =>
                                        setTemplate({ ...template, description: e.target.value })
                                    }
                                    multiline
                                    rows={2}
                                />

                                <FormControl fullWidth>
                                    <InputLabel>Channel</InputLabel>
                                    <Select
                                        value={template.channel}
                                        onChange={(e) =>
                                            setTemplate({
                                                ...template,
                                                channel: e.target.value as any,
                                            })
                                        }
                                        label="Channel"
                                    >
                                        <MenuItem value="email">📧 Email</MenuItem>
                                        <MenuItem value="sms">📱 SMS</MenuItem>
                                        <MenuItem value="whatsapp">💬 WhatsApp</MenuItem>
                                        <MenuItem value="physical_mail">📬 Physical Mail</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField
                                    fullWidth
                                    label="Category"
                                    value={template.category}
                                    onChange={(e) =>
                                        setTemplate({ ...template, category: e.target.value })
                                    }
                                    placeholder="e.g., Invoice Reminders"
                                />

                                {/* Variables Section */}
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                                        Insert Variables
                                    </Typography>
                                    <Box display="flex" flexWrap="wrap" gap={1}>
                                        {availableVariables.map((variable) => (
                                            <Tooltip key={variable.name} title={variable.description}>
                                                <Chip
                                                    label={variable.name}
                                                    onClick={() => insertVariable(variable.name)}
                                                    clickable
                                                    size="small"
                                                    sx={{
                                                        '&:hover': {
                                                            background: 'rgba(102, 126, 234, 0.1)',
                                                            borderColor: '#667eea',
                                                        },
                                                    }}
                                                    variant="outlined"
                                                />
                                            </Tooltip>
                                        ))}
                                    </Box>
                                </Box>

                                {/* Used Variables */}
                                {template.content.variables.length > 0 && (
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                                            Used Variables
                                        </Typography>
                                        <Box display="flex" flexWrap="wrap" gap={1}>
                                            {template.content.variables.map((variable) => (
                                                <Chip
                                                    key={variable}
                                                    label={variable}
                                                    size="small"
                                                    color="primary"
                                                    variant="filled"
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Grid>

                        {/* Right Panel - Content Editor */}
                        <Grid item xs={12} md={8}>
                            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                                <Tab label="Subject" disabled={template.channel !== 'email'} />
                                <Tab label="Body" />
                                <Tab label="Source Code" />
                            </Tabs>

                            {/* Subject Tab */}
                            {tab === 0 && template.channel === 'email' && (
                                <Box>
                                    <TextField
                                        fullWidth
                                        label="Email Subject"
                                        value={template.content.subject}
                                        onChange={(e) =>
                                            setTemplate({
                                                ...template,
                                                content: { ...template.content, subject: e.target.value },
                                            })
                                        }
                                        placeholder="Invoice {{invoice_number}} from {{company_name}}"
                                        sx={{ mb: 2 }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="Preheader Text (Optional)"
                                        value={template.content.preheader}
                                        onChange={(e) =>
                                            setTemplate({
                                                ...template,
                                                content: {
                                                    ...template.content,
                                                    preheader: e.target.value,
                                                },
                                            })
                                        }
                                        placeholder="Preview text that appears after subject"
                                        helperText="Optional preview text shown in email clients"
                                    />
                                </Box>
                            )}

                            {/* Body Tab */}
                            {tab === 1 && (
                                <Box
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                    }}
                                >
                                    {template.channel === 'email' ? (
                                        <Editor
                                            apiKey="your-tinymce-api-key"
                                            value={template.content.body}
                                            onEditorChange={(content) =>
                                                setTemplate({
                                                    ...template,
                                                    content: { ...template.content, body: content },
                                                })
                                            }
                                            init={{
                                                height: 500,
                                                menubar: true,
                                                plugins: [
                                                    'advlist',
                                                    'autolink',
                                                    'lists',
                                                    'link',
                                                    'image',
                                                    'charmap',
                                                    'preview',
                                                    'anchor',
                                                    'searchreplace',
                                                    'visualblocks',
                                                    'code',
                                                    'fullscreen',
                                                    'insertdatetime',
                                                    'media',
                                                    'table',
                                                    'code',
                                                    'help',
                                                    'wordcount',
                                                ],
                                                toolbar:
                                                    'undo redo | blocks | ' +
                                                    'bold italic forecolor | alignleft aligncenter ' +
                                                    'alignright alignjustify | bullist numlist outdent indent | ' +
                                                    'removeformat | help',
                                                content_style:
                                                    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size:14px }',
                                            }}
                                        />
                                    ) : (
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={20}
                                            value={template.content.body}
                                            onChange={(e) =>
                                                setTemplate({
                                                    ...template,
                                                    content: { ...template.content, body: e.target.value },
                                                })
                                            }
                                            placeholder={
                                                template.channel === 'sms'
                                                    ? 'Enter SMS message (160 chars recommended)'
                                                    : 'Enter message content'
                                            }
                                            variant="outlined"
                                        />
                                    )}
                                </Box>
                            )}

                            {/* Source Code Tab */}
                            {tab === 2 && (
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={20}
                                    value={template.content.body}
                                    onChange={(e) =>
                                        setTemplate({
                                            ...template,
                                            content: { ...template.content, body: e.target.value },
                                        })
                                    }
                                    variant="outlined"
                                    sx={{ fontFamily: 'monospace' }}
                                />
                            )}
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Typography variant="h6" fontWeight={600}>
                        Template Preview
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {template.channel === 'email' && (
                        <Box mb={2}>
                            <Typography variant="caption" color="text.secondary">
                                Subject:
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                                {renderedPreview.subject}
                            </Typography>
                        </Box>
                    )}
                    <Box
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            p: 2,
                            background: '#f5f5f5',
                        }}
                        dangerouslySetInnerHTML={{ __html: renderedPreview.body }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
