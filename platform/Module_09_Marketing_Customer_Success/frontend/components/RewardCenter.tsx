import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Button,
    Grid,
    Chip,
    Paper,
    LinearProgress,
    Alert,
} from '@mui/material';
import {
    CardGiftcard as GiftIcon,
    CheckCircle as CheckIcon,
    Schedule as ScheduleIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface Reward {
    id: string;
    rewardType: string;
    rewardAmount: number;
    rewardTier: string;
    isClaimed: boolean;
    claimedAt: string;
    expiresAt: string;
    description: string;
    createdAt: string;
}

export const RewardCenter: React.FC = () => {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);

    useEffect(() => {
        loadRewards();
    }, []);

    const loadRewards = async () => {
        try {
            setLoading(true);
            const userId = 'current-user-id'; // TODO: Get from auth context
            const response = await axios.get(`/api/v1/referrals/rewards/${userId}`);
            setRewards(response.data);
        } catch (error) {
            console.error('Failed to load rewards:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimReward = async (rewardId: string) => {
        try {
            setClaiming(rewardId);
            const userId = 'current-user-id'; // TODO: Get from auth context
            await axios.put(`/api/v1/referrals/rewards/${rewardId}/claim`, { userId });
            await loadRewards();
            // TODO: Show success toast
        } catch (error: any) {
            console.error('Failed to claim reward:', error);
            // TODO: Show error toast
            alert(error.response?.data?.message || 'Failed to claim reward');
        } finally {
            setClaiming(null);
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'platinum':
                return '#E5E4E2';
            case 'gold':
                return '#FFD700';
            case 'silver':
                return '#C0C0C0';
            default:
                return '#CD7F32';
        }
    };

    const formatDate = (date: string) => {
        return date ? new Date(date).toLocaleDateString() : '';
    };

    const isExpired = (expiresAt: string) => {
        return expiresAt && new Date() > new Date(expiresAt);
    };

    const availableRewards = rewards.filter((r) => !r.isClaimed && !isExpired(r.expiresAt));
    const claimedRewards = rewards.filter((r) => r.isClaimed);
    const expiredRewards = rewards.filter((r) => !r.isClaimed && isExpired(r.expiresAt));

    const totalAvailable = availableRewards.reduce((sum, r) => sum + r.rewardAmount, 0);
    const totalClaimed = claimedRewards.reduce((sum, r) => sum + r.rewardAmount, 0);

    return (
        <Box>
            <Typography variant="h5" sx={{ mb: 3 }}>
                Reward Center
            </Typography>

            {/* Summary */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                        <Typography variant="h4" color="success.dark" fontWeight="bold">
                            ₹{totalAvailable}
                        </Typography>
                        <Typography variant="body2" color="success.dark">
                            Available to Claim
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                        <Typography variant="h4" color="primary.dark" fontWeight="bold">
                            ₹{totalClaimed}
                        </Typography>
                        <Typography variant="body2" color="primary.dark">
                            Total Claimed
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {loading ? (
                <LinearProgress />
            ) : (
                <>
                    {/* Available Rewards */}
                    {availableRewards.length > 0 && (
                        <Card sx={{ mb: 3 }}>
                            <CardHeader
                                title="Available Rewards"
                                subheader={`${availableRewards.length} rewards ready to claim`}
                                avatar={<GiftIcon color="success" />}
                            />
                            <CardContent>
                                <Grid container spacing={2}>
                                    {availableRewards.map((reward) => (
                                        <Grid item xs={12} sm={6} md={4} key={reward.id}>
                                            <Paper
                                                variant="outlined"
                                                sx={{
                                                    p: 2,
                                                    borderColor: getTierColor(reward.rewardTier),
                                                    borderWidth: 2,
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Chip
                                                        label={reward.rewardTier.toUpperCase()}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: getTierColor(reward.rewardTier),
                                                            color: 'white',
                                                        }}
                                                    />
                                                    <Typography variant="h6" fontWeight="bold">
                                                        ₹{reward.rewardAmount}
                                                    </Typography>
                                                </Box>

                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                    {reward.description}
                                                </Typography>

                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                                    Expires: {formatDate(reward.expiresAt)}
                                                </Typography>

                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    color="success"
                                                    onClick={() => handleClaimReward(reward.id)}
                                                    disabled={claiming === reward.id}
                                                    startIcon={claiming === reward.id ? <ScheduleIcon /> : <CheckIcon />}
                                                >
                                                    {claiming === reward.id ? 'Claiming...' : 'Claim Now'}
                                                </Button>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    )}

                    {/* Claimed Rewards */}
                    {claimedRewards.length > 0 && (
                        <Card sx={{ mb: 3 }}>
                            <CardHeader
                                title="Claimed Rewards"
                                subheader={`${claimedRewards.length} rewards claimed`}
                                avatar={<CheckIcon color="primary" />}
                            />
                            <CardContent>
                                <Grid container spacing={2}>
                                    {claimedRewards.map((reward) => (
                                        <Grid item xs={12} sm={6} md={4} key={reward.id}>
                                            <Paper variant="outlined" sx={{ p: 2, opacity: 0.7 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Chip
                                                        label="CLAIMED"
                                                        size="small"
                                                        color="primary"
                                                    />
                                                    <Typography variant="h6" fontWeight="bold">
                                                        ₹{reward.rewardAmount}
                                                    </Typography>
                                                </Box>

                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    {reward.description}
                                                </Typography>

                                                <Typography variant="caption" color="text.secondary">
                                                    Claimed on: {formatDate(reward.claimedAt)}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    )}

                    {/* No Rewards */}
                    {rewards.length === 0 && (
                        <Alert severity="info">
                            <Typography variant="body2">
                                No rewards yet. Complete more referrals to earn rewards!
                            </Typography>
                        </Alert>
                    )}

                    {/* Expired Rewards */}
                    {expiredRewards.length > 0 && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                                You have {expiredRewards.length} expired reward(s).
                                Make sure to claim your rewards before they expire!
                            </Typography>
                        </Alert>
                    )}
                </>
            )}
        </Box>
    );
};
