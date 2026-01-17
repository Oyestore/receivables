import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Grid, TextField,
    FormControlLabel, Checkbox, Button, Box, Slider, Divider
} from '@mui/material';
import { AccountBalance, Save } from '@mui/icons-material';

export const LenderConfig: React.FC = () => {
    const [tiers, setTiers] = useState<string[]>(['PRIME']);
    const [minRevenue, setMinRevenue] = useState<number>(1000000); // 10 Lakhs
    const [baseRate, setBaseRate] = useState<number>(12.5);

    const handleTierChange = (tier: string) => {
        if (tiers.includes(tier)) {
            setTiers(tiers.filter(t => t !== tier));
        } else {
            setTiers([...tiers, tier]);
        }
    };

    return (
        <Box p={3}>
            <Card elevation={3}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                        <AccountBalance fontSize="large" color="primary" />
                        <Box>
                            <Typography variant="h5" fontWeight="bold">Lending Criteria Configuration</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Define your "Buy Box". The platform correlates this with M06 Scores and M13 Export Data to match leads.
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>1. Risk Appetite</Typography>
                            <Typography variant="body2" color="textSecondary" mb={2}>
                                Which borrower tiers are you willing to fund?
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={1}>
                                <FormControlLabel
                                    control={<Checkbox checked={tiers.includes('PRIME')} onChange={() => handleTierChange('PRIME')} />}
                                    label="PRIME (Score > 750, Proven Exporter)"
                                />
                                <FormControlLabel
                                    control={<Checkbox checked={tiers.includes('NEAR_PRIME')} onChange={() => handleTierChange('NEAR_PRIME')} />}
                                    label="NEAR PRIME (Score 650-750)"
                                />
                                <FormControlLabel
                                    control={<Checkbox checked={tiers.includes('SUB_PRIME')} onChange={() => handleTierChange('SUB_PRIME')} />}
                                    label="SUB PRIME (High Yield, High Risk)"
                                />
                            </Box>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>2. Financial Thresholds</Typography>
                            <Box mb={3}>
                                <Typography gutterBottom>Minimum Monthly Revenue (₹)</Typography>
                                <Slider
                                    value={minRevenue}
                                    onChange={(_, val) => setMinRevenue(val as number)}
                                    min={100000}
                                    max={5000000}
                                    step={100000}
                                    valueLabelDisplay="auto"
                                    valueLabelFormat={(val) => `₹${val / 1000}k`}
                                />
                                <TextField
                                    value={minRevenue}
                                    size="small"
                                    fullWidth
                                    InputProps={{ startAdornment: <Typography mr={1}>₹</Typography> }}
                                />
                            </Box>

                            <Box>
                                <Typography gutterBottom>Base Interest Rate (%)</Typography>
                                <TextField
                                    type="number"
                                    value={baseRate}
                                    onChange={(e) => setBaseRate(Number(e.target.value))}
                                    size="small"
                                    fullWidth
                                    helperText="This is the starting rate for Prime borrowers."
                                />
                            </Box>
                        </Grid>
                    </Grid>

                    <Box mt={4} display="flex" justifyContent="flex-end">
                        <Button variant="contained" color="primary" startIcon={<Save />}>
                            Update Lending Rules
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};
