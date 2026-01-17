import React from 'react';
import { Card, CardContent, Grid, TextField, MenuItem, Typography, InputAdornment } from '@mui/material';

export const ExportInvoiceDetails: React.FC<{ visible: boolean }> = ({ visible }) => {
    if (!visible) return null;

    return (
        <Card variant="outlined" sx={{ mt: 2, bgcolor: '#f8f9fa', borderColor: '#90caf9' }}>
            <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="primary">
                    Export Details (Module 13)
                </Typography>

                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <TextField
                            select
                            fullWidth
                            label="Presentation Currency"
                            defaultValue="USD"
                            size="small"
                        >
                            <MenuItem value="USD">USD ($)</MenuItem>
                            <MenuItem value="EUR">EUR (€)</MenuItem>
                            <MenuItem value="GBP">GBP (£)</MenuItem>
                            {/* Bilateral Trade Options */}
                            <MenuItem value="AED">AED (Dirham)</MenuItem>
                            <MenuItem value="RUB">RUB (Ruble)</MenuItem>
                            <MenuItem value="SGD">SGD (Dollar)</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <TextField
                            select
                            fullWidth
                            label="Incoterms"
                            placeholder="Select Incoterm"
                            size="small"
                        >
                            <MenuItem value="FOB">FOB - Free On Board</MenuItem>
                            <MenuItem value="CIF">CIF - Cost, Insurance & Freight</MenuItem>
                            <MenuItem value="DDP">DDP - Delivered Duty Paid</MenuItem>
                            <MenuItem value="EXW">EXW - Ex Works</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Exchange Rate (Locked)"
                            defaultValue="83.50"
                            size="small"
                            InputProps={{
                                readOnly: true,
                                endAdornment: <InputAdornment position="end">INR</InputAdornment>,
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Port of Loading"
                            placeholder="e.g., Nhava Sheva, Mumbai"
                            size="small"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Port of Discharge"
                            placeholder="e.g., Port of Long Beach, USA"
                            size="small"
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};
