import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Download, ExternalLink, RefreshCw, Layout, Database } from 'lucide-react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Alert,
    CircularProgress,
    Divider
} from '@mui/material';
import { PowerBIService, PowerBIDataset, PowerBIWorkspace, DatasetType } from '../../services/powerbi.service';

// Mock Tenant ID
const TENANT_ID = 'TENANT_1';

export const PowerBIDashboard: React.FC = () => {
    const [datasets, setDatasets] = useState<PowerBIDataset[]>([]);
    const [workspaces, setWorkspaces] = useState<PowerBIWorkspace[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    const [selectedDataset, setSelectedDataset] = useState<DatasetType | ''>('');
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' }>({
        open: false,
        message: '',
        severity: 'info'
    });

    // Embed state
    const [embedUrl, setEmbedUrl] = useState('');
    const [showReport, setShowReport] = useState(false);

    useEffect(() => {
        loadMetadata();
    }, []);

    const loadMetadata = async () => {
        setLoading(true);
        try {
            const [ds, ws] = await Promise.all([
                PowerBIService.getDatasets(TENANT_ID),
                PowerBIService.getWorkspaces()
            ]);
            setDatasets(ds.length ? ds : [
                { type: DatasetType.INVOICES, name: 'Invoice Analytics', description: 'Comprehensive invoice data', columns: [] },
                { type: DatasetType.CASH_FLOW, name: 'Cash Flow Forecast', description: 'Predicted cash flow', columns: [] }
            ]);
            setWorkspaces(ws.length ? ws : [
                { id: 'WS_1', name: 'My Workspace', isReadOnly: false },
                { id: 'WS_2', name: 'Executive Reports', isReadOnly: true }
            ]);
        } catch (error) {
            console.error("Failed to load metadata", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!selectedWorkspace || !selectedDataset) return;

        setExporting(true);
        try {
            await PowerBIService.exportToWorkspace(TENANT_ID, selectedWorkspace, selectedDataset as DatasetType);
            setNotification({
                open: true,
                message: 'Dataset exported successfully to Power BI',
                severity: 'success'
            });
            // Simulate report generation
            setShowReport(true);
        } catch (error) {
            setNotification({
                open: true,
                message: 'Failed to export data',
                severity: 'error'
            });
        } finally {
            setExporting(false);
        }
    };

    return (
        <Box sx={{ p: 4, maxWidth: 1600, margin: '0 auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <BarChart2 size={32} color="#f2c811" style={{ marginRight: 16 }} />
                <Box>
                    <Typography variant="h4" fontWeight="bold">Power BI Analytics</Typography>
                    <Typography variant="body1" color="text.secondary">
                        Advanced reporting and business intelligence integration
                    </Typography>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Configuration Panel */}
                <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                                <Database size={20} style={{ marginRight: 8 }} />
                                Data Export Config
                            </Typography>
                            <Divider sx={{ mb: 3 }} />

                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel>Select Workspace</InputLabel>
                                        <Select
                                            value={selectedWorkspace}
                                            label="Select Workspace"
                                            onChange={(e) => setSelectedWorkspace(e.target.value)}
                                        >
                                            {workspaces.map(ws => (
                                                <MenuItem key={ws.id} value={ws.id}>{ws.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel>Select Dataset</InputLabel>
                                        <Select
                                            value={selectedDataset}
                                            label="Select Dataset"
                                            onChange={(e) => setSelectedDataset(e.target.value as DatasetType)}
                                        >
                                            {datasets.map(ds => (
                                                <MenuItem key={ds.type} value={ds.type}>
                                                    <Box>
                                                        <Typography variant="body1">{ds.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{ds.description}</Typography>
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12}>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        size="large"
                                        color="primary" // Power BI yellow-ish branding usually, but using primary for consistency
                                        startIcon={exporting ? <CircularProgress size={20} color="inherit" /> : <Download />}
                                        onClick={handleExport}
                                        disabled={!selectedWorkspace || !selectedDataset || exporting}
                                        sx={{
                                            backgroundColor: '#f2c811',
                                            color: '#000',
                                            '&:hover': { backgroundColor: '#dbb400' }
                                        }}
                                    >
                                        {exporting ? 'Exporting Data...' : 'Export to Power BI'}
                                    </Button>
                                </Grid>

                                {showReport && (
                                    <Grid item xs={12}>
                                        <Alert severity="success" icon={<CheckCircle size={20} />}>
                                            Data initialized. Report is ready to view.
                                        </Alert>
                                    </Grid>
                                )}
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Report Viewer / Placeholder */}
                <Grid item xs={12} md={8}>
                    <Card variant="outlined" sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flex: 1, p: 0, position: 'relative', bgcolor: '#f8fafc' }}>
                            {showReport ? (
                                <Box sx={{ width: '100%', height: '100%' }}>
                                    {/* Embed Iframe Placeholder */}
                                    <iframe
                                        title="Power BI Report"
                                        width="100%"
                                        height="100%"
                                        src="https://app.powerbi.com/reportEmbed?reportId=mock-report-id"
                                        frameBorder="0"
                                        allowFullScreen={true}
                                        style={{ border: 'none' }}
                                    ></iframe>
                                </Box>
                            ) : (
                                <Box sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.6
                                }}>
                                    <Layout size={64} color="#CBD5E1" />
                                    <Typography variant="h6" color="text.secondary" mt={2}>
                                        Select a dataset and export to view report
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                        <Divider />
                        <CardContent sx={{ py: 1, px: 2, bgcolor: '#fff' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box display="flex" gap={1}>
                                    <Chip label="Live Connection" size="small" color="success" variant="outlined" />
                                    <Chip label="Last Refreshed: Just now" size="small" variant="outlined" />
                                </Box>
                                <Button size="small" startIcon={<ExternalLink size={14} />}>
                                    Open in Power BI Service
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

// Start Icon helper because Lucide CheckCircle was used inside Alert but not imported in replacement map if I missed it
import { CheckCircle } from 'lucide-react';
