import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertCircle, Globe, CheckCircle } from 'lucide-react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Switch,
    FormControlLabel,
    Card,
    CardContent,
    Alert,
    Snackbar,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress
} from '@mui/material';
import { AdminConfigService, GlobalTradeConfig as ConfigType } from '../../services/admin-config.service';

export const GlobalTradeConfig: React.FC = () => {
    const [config, setConfig] = useState<ConfigType>({
        enabled: false,
        lutNumber: '',
        filingFrequency: 'monthly',
        autoExchangeRateFetch: true
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const data = await AdminConfigService.getGlobalTradeConfig();
            setConfig(data);
        } catch (error) {
            console.error("Failed to load config", error);
            setNotification({
                open: true,
                message: 'Failed to load configuration. Using defaults.',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await AdminConfigService.saveGlobalTradeConfig(config);
            setNotification({
                open: true,
                message: 'Configuration saved successfully!',
                severity: 'success'
            });
        } catch (error) {
            console.error("Failed to save config", error);
            setNotification({
                open: true,
                message: 'Failed to save configuration',
                severity: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            <div className="config-header">
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Globe size={32} style={{ marginRight: '16px', color: '#2563eb' }} />
                    <Typography variant="h4" component="h1">
                        Global Trade Configuration
                    </Typography>
                </Box>
            </div>

            <Card variant="outlined" sx={{ mb: 4 }}>
                <CardContent>
                    <Box sx={{ mb: 3 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={config.enabled}
                                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                    color="primary"
                                />
                            }
                            label="Enable Global Trade Features"
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Enables multi-currency support, cross-border invoicing, and automated forex updates.
                        </Typography>
                    </Box>

                    {config.enabled && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.3 }}
                        >
                            <Box sx={{ display: 'grid', gap: 3, mt: 2 }}>
                                <TextField
                                    label="LUT Number (Letter of Undertaking)"
                                    variant="outlined"
                                    fullWidth
                                    value={config.lutNumber || ''}
                                    onChange={(e) => setConfig({ ...config, lutNumber: e.target.value })}
                                    helperText="Required for zero-rated exports under GST"
                                />

                                <FormControl fullWidth>
                                    <InputLabel>GST Filing Frequency</InputLabel>
                                    <Select
                                        value={config.filingFrequency}
                                        label="GST Filing Frequency"
                                        onChange={(e) => setConfig({ ...config, filingFrequency: e.target.value as any })}
                                    >
                                        <MenuItem value="monthly">Monthly</MenuItem>
                                        <MenuItem value="quarterly">Quarterly</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={config.autoExchangeRateFetch}
                                            onChange={(e) => setConfig({ ...config, autoExchangeRateFetch: e.target.checked })}
                                            color="primary"
                                        />
                                    }
                                    label="Auto-fetch Daily Exchange Rates"
                                />
                            </Box>
                        </motion.div>
                    )}
                </CardContent>
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={saving ? null : <Save size={18} />}
                    onClick={handleSave}
                    disabled={saving}
                    size="large"
                >
                    {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
            </Box>

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={() => setNotification({ ...notification, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={notification.severity} variant="filled" onClose={() => setNotification({ ...notification, open: false })}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};
