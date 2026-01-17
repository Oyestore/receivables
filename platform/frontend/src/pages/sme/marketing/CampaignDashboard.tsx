import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Button, Grid, Card, CardContent } from '@mui/material';
import { Add, Campaign } from '@mui/icons-material';
import { marketingAPI } from '../../../config/api';
import { Campaign as CampaignType } from '../../../types/marketing';

const CampaignDashboard: React.FC = () => {
    const { data: campaigns = [], isLoading } = useQuery<CampaignType[]>({
        queryKey: ['campaigns'],
        queryFn: () => marketingAPI.getCampaigns('defaultTenant').then((res) => res.data),
    });

    if (isLoading) return <Typography>Loading campaigns...</Typography>;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Marketing Campaigns</Typography>
                <Button variant="contained" startIcon={<Add />}>Create Campaign</Button>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                        <CardContent>
                            <Typography variant="h6">Total Leads</Typography>
                            <Typography variant="h3">1,240</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={8}>
                    {/* Campaign list or chart placeholder */}
                    <Typography variant="h6">Recent Campaigns</Typography>
                    {campaigns.map(c => (
                        <Box key={c.id} sx={{ p: 2, border: 1, borderColor: 'divider', mb: 1, borderRadius: 1 }}>
                            {c.name} - {c.status}
                        </Box>
                    ))}
                </Grid>
            </Grid>
        </Box>
    );
};

export default CampaignDashboard;
