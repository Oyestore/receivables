import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    TextField,
    InputAdornment,
    Chip,
    Button,
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Search,
    FilterList,
    Add,
    MoreVert,
    Email,
    Sms,
    WhatsApp,
    ContentCopy,
    Edit,
    Delete,
    Preview,
    CheckCircle,
    Schedule,
} from '@mui/icons-material';

interface Template {
    id: string;
    name: string;
    channel: 'email' | 'sms' | 'whatsapp' | 'physical_mail';
    status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
    usageCount: number;
    category: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

export const TemplateLibrary: React.FC = () => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChannel, setSelectedChannel] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        filterTemplates();
    }, [searchQuery, selectedChannel, selectedStatus, templates]);

    const loadTemplates = async () => {
        // API call to load templates
        const response = await fetch('/api/v1/distribution/templates');
        const data = await response.json();
        setTemplates(data.templates || []);
    };

    const filterTemplates = () => {
        let filtered = templates;

        if (searchQuery) {
            filtered = filtered.filter(
                (t) =>
                    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.category?.toLowerCase().includes(searchQuery.toLowerCase()),
            );
        }

        if (selectedChannel !== 'all') {
            filtered = filtered.filter((t) => t.channel === selectedChannel);
        }

        if (selectedStatus !== 'all') {
            filtered = filtered.filter((t) => t.status === selectedStatus);
        }

        setFilteredTemplates(filtered);
    };

    const handleClone = async (template: Template) => {
        // Clone template
        const response = await fetch(`/api/v1/distribution/templates/${template.id}/clone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `${template.name} (Copy)` }),
        });

        if (response.ok) {
            loadTemplates();
        }
    };

    const handleDelete = async (template: Template) => {
        if (confirm(`Delete template "${template.name}"?`)) {
            await fetch(`/api/v1/distribution/templates/${template.id}`, {
                method: 'DELETE',
            });
            loadTemplates();
        }
    };

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'email':
                return <Email fontSize="small" />;
            case 'sms':
                return <Sms fontSize="small" />;
            case 'whatsapp':
                return <WhatsApp fontSize="small" />;
            default:
                return null;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'success';
            case 'pending_approval':
                return 'warning';
            case 'rejected':
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight={600}>
                    Template Library
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                    href="/distribution/templates/new"
                >
                    Create Template
                </Button>
            </Box>

            {/* Filters */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                placeholder="Search templates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Tabs value={selectedChannel} onChange={(_, v) => setSelectedChannel(v)}>
                                <Tab label="All" value="all" />
                                <Tab icon={<Email />} value="email" />
                                <Tab icon={<Sms />} value="sms" />
                                <Tab icon={<WhatsApp />} value="whatsapp" />
                            </Tabs>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Tabs value={selectedStatus} onChange={(_, v) => setSelectedStatus(v)}>
                                <Tab label="All Status" value="all" />
                                <Tab label="Approved" value="approved" />
                                <Tab label="Draft" value="draft" />
                                <Tab label="Pending" value="pending_approval" />
                            </Tabs>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Template Grid */}
            <Grid container spacing={3}>
                {filteredTemplates.map((template) => (
                    <Grid item xs={12} md={4} key={template.id}>
                        <Card
                            elevation={0}
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                height: '100%',
                                transition: 'all 0.3s',
                                '&:hover': {
                                    borderColor: '#667eea',
                                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.15)',
                                    transform: 'translateY(-4px)',
                                },
                            }}
                        >
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        {getChannelIcon(template.channel)}
                                        <Typography variant="h6" fontWeight={600}>
                                            {template.name}
                                        </Typography>
                                    </Box>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            setAnchorEl(e.currentTarget);
                                            setSelectedTemplate(template);
                                        }}
                                    >
                                        <MoreVert />
                                    </IconButton>
                                </Box>

                                <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                                    <Chip
                                        label={template.status.replace('_', ' ')}
                                        color={getStatusColor(template.status) as any}
                                        size="small"
                                    />
                                    {template.category && (
                                        <Chip label={template.category} size="small" variant="outlined" />
                                    )}
                                </Box>

                                {template.tags && template.tags.length > 0 && (
                                    <Box display="flex" gap={0.5} mb={2} flexWrap="wrap">
                                        {template.tags.slice(0, 3).map((tag) => (
                                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                                        ))}
                                        {template.tags.length > 3 && (
                                            <Chip label={`+${template.tags.length - 3}`} size="small" />
                                        )}
                                    </Box>
                                )}

                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary">
                                        Used {template.usageCount} times
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {new Date(template.updatedAt).toLocaleDateString()}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Empty State */}
            {filteredTemplates.length === 0 && (
                <Box textAlign="center" py={8}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No templates found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        Try adjusting your filters or create a new template
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        href="/distribution/templates/new"
                    >
                        Create Template
                    </Button>
                </Box>
            )}

            {/* Context Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem
                    onClick={() => {
                        window.location.href = `/distribution/templates/${selectedTemplate?.id}/preview`;
                        setAnchorEl(null);
                    }}
                >
                    <Preview fontSize="small" sx={{ mr: 1 }} />
                    Preview
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        window.location.href = `/distribution/templates/${selectedTemplate?.id}/edit`;
                        setAnchorEl(null);
                    }}
                >
                    <Edit fontSize="small" sx={{ mr: 1 }} />
                    Edit
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (selectedTemplate) handleClone(selectedTemplate);
                        setAnchorEl(null);
                    }}
                >
                    <ContentCopy fontSize="small" sx={{ mr: 1 }} />
                    Clone
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (selectedTemplate) handleDelete(selectedTemplate);
                        setAnchorEl(null);
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <Delete fontSize="small" sx={{ mr: 1 }} />
                    Delete
                </MenuItem>
            </Menu>
        </Box>
    );
};
