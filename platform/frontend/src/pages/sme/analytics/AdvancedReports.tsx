import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Button,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { Download, CalendarMonth } from '@mui/icons-material';
import { analyticsAPI } from '../../../config/api';

const AdvancedReports: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [dateRange, setDateRange] = useState('quarter');

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleExport = (format: 'csv' | 'json') => {
        // In a real app, this would trigger the download
        console.log(`Exporting report as ${format}`);
        // analyticsAPI.exportReport(...)
        alert(`Report export started for ${format.toUpperCase()}`);
    };

    // Mock data for report preview
    const reportData = [
        { category: 'Operating Activities', amount: 150000 },
        { category: 'Investing Activities', amount: -50000 },
        { category: 'Financing Activities', amount: 20000 },
        { category: 'Net Cash Flow', amount: 120000 },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Advanced Financial Reports</Typography>
                <Box>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        sx={{ mr: 1 }}
                        onClick={() => handleExport('csv')}
                    >
                        Export CSV
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Download />}
                        onClick={() => handleExport('json')}
                    >
                        Export JSON
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ mb: 3, p: 2 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Date Range</InputLabel>
                            <Select
                                value={dateRange}
                                label="Date Range"
                                onChange={(e) => setDateRange(e.target.value)}
                            >
                                <MenuItem value="month">This Month</MenuItem>
                                <MenuItem value="quarter">This Quarter</MenuItem>
                                <MenuItem value="year">Year to Date</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            <Paper sx={{ width: '100%' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    centered
                >
                    <Tab label="Cash Flow Statement" />
                    <Tab label="Aging Report" />
                    <Tab label="Revenue by Client" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {tabValue === 0 && (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Category</TableCell>
                                    <TableCell align="right">Amount (₹)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData.map((row) => (
                                    <TableRow key={row.category}>
                                        <TableCell component="th" scope="row" sx={{ fontWeight: row.category === 'Net Cash Flow' ? 'bold' : 'normal' }}>
                                            {row.category}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: row.category === 'Net Cash Flow' ? 'bold' : 'normal' }}>
                                            {row.amount.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {tabValue === 1 && <Typography sx={{ p: 2, textAlign: 'center' }}>Aging Report Visualization coming soon.</Typography>}
                    {tabValue === 2 && <Typography sx={{ p: 2, textAlign: 'center' }}>Revenue Charts coming soon.</Typography>}
                </Box>
            </Paper>
        </Box>
    );
};

export default AdvancedReports;
