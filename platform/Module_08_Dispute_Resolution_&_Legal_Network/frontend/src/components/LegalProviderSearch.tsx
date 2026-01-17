import React, { useState, useEffect } from 'react';
import { legalApi } from '../services/legalApi';
import { LegalProviderProfile } from '../types/dispute.types';
import {
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Avatar,
    Box
} from '@mui/material';

const LegalProviderSearch = () => {
    const [providers, setProviders] = useState<LegalProviderProfile[]>([]);
    const [filters, setFilters] = useState({
        city: '',
        specialization: '',
        status: ''
    });
    const [loading, setLoading] = useState(false);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const data = await legalApi.getAll(filters);
            setProviders(data);
        } catch (error) {
            console.error('Failed to fetch providers', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Legal Provider Network
            </Typography>

            <Card sx={{ mb: 4, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <TextField
                            label="City"
                            fullWidth
                            value={filters.city}
                            onChange={(e) => handleFilterChange('city', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Specialization</InputLabel>
                            <Select
                                value={filters.specialization}
                                label="Specialization"
                                onChange={(e) => handleFilterChange('specialization', e.target.value)}
                            >
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="debt_recovery">Debt Recovery</MenuItem>
                                <MenuItem value="msme_disputes">MSME Disputes</MenuItem>
                                <MenuItem value="arbitration">Arbitration</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={fetchProviders}
                            disabled={loading}
                        >
                            {loading ? 'Searching...' : 'Search Advocates'}
                        </Button>
                    </Grid>
                </Grid>
            </Card>

            <Grid container spacing={3}>
                {providers.map(provider => (
                    <Grid item xs={12} md={4} key={provider.id}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" mb={2}>
                                    <Avatar src={provider.profileImage} sx={{ width: 56, height: 56, mr: 2 }} />
                                    <Box>
                                        <Typography variant="h6">{provider.name}</Typography>
                                        <Typography variant="body2" color="textSecondary">{provider.firmName}</Typography>
                                    </Box>
                                </Box>
                                <Typography variant="body2" paragraph>
                                    <strong>Experience:</strong> {provider.yearsOfExperience} years
                                </Typography>
                                <Typography variant="body2" paragraph>
                                    <strong>Location:</strong> {provider.locations.join(', ')}
                                </Typography>
                                <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                                    {provider.specializations.map(spec => (
                                        <Chip key={spec} label={spec} size="small" />
                                    ))}
                                </Box>
                                <Button variant="outlined" fullWidth>View Profile</Button>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default LegalProviderSearch;
