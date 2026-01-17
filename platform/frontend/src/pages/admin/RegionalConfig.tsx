import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Grid,
    TextField,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Button,
    Box,
    Snackbar,
    Alert
} from '@mui/material';
import { Public, Save } from '@mui/icons-material';

export const RegionalConfig: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(false);

    // Default: Mon-Sat
    const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5, 6]);

    const handleDayToggle = (day: number) => {
        if (workingDays.includes(day)) {
            setWorkingDays(workingDays.filter(d => d !== day));
        } else {
            setWorkingDays([...workingDays, day]);
        }
    };

    const handleSave = () => {
        setLoading(true);
        console.log('Updating Regional Config...');
        setTimeout(() => {
            setLoading(false);
            setNotification(true);
        }, 1000);
    };

    return (
        <Box p={3}>
            <Card elevation={3}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={3}>
                        <Public color="secondary" fontSize="large" />
                        <Box>
                            <Typography variant="h5" fontWeight="bold">Regional Intelligence</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Module 14: Configure culture, timezones, and business calendar.
                            </Typography>
                        </Box>
                    </Box>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <TextField
                                select
                                fullWidth
                                label="Primary Locale"
                                defaultValue="en-IN"
                            >
                                <MenuItem value="en-IN">English (India)</MenuItem>
                                <MenuItem value="en-US">English (USA)</MenuItem>
                                <MenuItem value="ar-AE">Arabic (UAE)</MenuItem>
                                <MenuItem value="de-DE">German (Germany)</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                select
                                fullWidth
                                label="Timezone"
                                defaultValue="Asia/Kolkata"
                            >
                                <MenuItem value="Asia/Kolkata">Asia/Kolkata (IST)</MenuItem>
                                <MenuItem value="Asia/Dubai">Asia/Dubai (GST)</MenuItem>
                                <MenuItem value="Europe/Berlin">Europe/Berlin (CET)</MenuItem>
                                <MenuItem value="America/New_York">America/New_York (EST)</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                select
                                fullWidth
                                label="Date Format"
                                defaultValue="DD/MM/YYYY"
                            >
                                <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</MenuItem>
                                <MenuItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</MenuItem>
                                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</MenuItem>
                            </TextField>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>Working Days (SLA Calculation)</Typography>
                            <Box display="flex" gap={2} flexWrap="wrap">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                    <FormControlLabel
                                        key={day}
                                        control={
                                            <Checkbox
                                                checked={workingDays.includes(index)}
                                                onChange={() => handleDayToggle(index)}
                                            />
                                        }
                                        label={day}
                                    />
                                ))}
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<Save />}
                                onClick={handleSave}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Regional Settings'}
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Snackbar
                open={notification}
                autoHideDuration={4000}
                onClose={() => setNotification(false)}
            >
                <Alert severity="success" onClose={() => setNotification(false)}>
                    Regional settings updated successfully!
                </Alert>
            </Snackbar>
        </Box>
    );
};
