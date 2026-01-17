import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Grid,
    Button,
    TextField,
    IconButton,
    Tooltip,
    Chip,
    LinearProgress,
    Paper,
    Avatar,
    Divider,
    Alert,
} from '@mui/material';
import {
    ContentCopy as CopyIcon,
    Share as ShareIcon,
    EmojiEvents as TrophyIcon,
    TrendingUp as TrendingUpIcon,
    People as PeopleIcon,
    AttachMoney as MoneyIcon,
    WhatsApp,
    Email,
    Sms,
} from '@mui/icons-material';
import axios from 'axios';

interface ReferralStats {
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    conversationRate: string;
    totalEarned: number;
    totalClaimed: number;
    pendingRewards: number;
    currentTier: string;
    currentStreak: number;
    rank: number;
    avgRewardPerReferral: string;
}

export const ReferralDashboard: React.FC = () => {
    const [referralCode, setReferralCode] = useState('');
    const [referralLink, setReferralLink] = useState('');
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [generated, setGenerated] = useState(false);

    useEffect(() => {
        loadReferralData();
    }, []);

    const loadReferralData = async () => {
        try {
            setLoading(true);
            const userId = 'current-user-id'; // TODO: Get from auth context

            // Load stats
            const statsResponse = await axios.get(`/api/v1/referrals/analytics/${userId}`);
            setStats(statsResponse.data);

            // Check if user has existing code
            const referralsResponse = await axios.get(`/api/v1/referrals/my-referrals/${userId}`);
            if (referralsResponse.data.length > 0) {
                setReferralCode(referralsResponse.data[0].referralCode);
                setGenerated(true);
                generateLink(referralsResponse.data[0].referralCode);
            }
        } catch (error) {
            console.error('Failed to load referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCode = async () => {
        try {
            const userId = 'current-user-id'; // TODO: Get from auth context
            const response = await axios.post('/api/v1/referrals/generate-code', {
                referrerId: userId,
                utmSource: 'referral',
                utmMedium: 'dashboard',
                utmCampaign: 'viral_growth',
            });

            setReferralCode(response.data.code);
            setReferralLink(response.data.link);
            setGenerated(true);
        } catch (error) {
            console.error('Failed to generate referral code:', error);
        }
    };

    const generateLink = (code: string) => {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/signup?ref=${code}&utm_source=referral&utm_medium=link`;
        setReferralLink(link);
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(referralCode);
        // TODO: Show success toast
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        // TODO: Show success toast
    };

    const handleShare = (channel: 'whatsapp' | 'email' | 'sms') => {
        const message = `Join SME Pay using my referral code ${referralCode} and get special rewards! ${referralLink}`;

        switch (channel) {
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
                break;
            case 'email':
                window.location.href = `mailto:?subject=Join SME Pay&body=${encodeURIComponent(message)}`;
                break;
            case 'sms':
                window.location.href = `sms:?body=${encodeURIComponent(message)}`;
                break;
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

    const getTierIcon = (tier: string) => {
        return <TrophyIcon sx={{ color: getTierColor(tier) }} />;
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3 }}>
                Referral Program
            </Typography>

            {loading ? (
                <LinearProgress />
            ) : (
                <Grid container spacing={3}>
                    {/* Referral Code Section */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardHeader
                                title="Your Referral Code"
                                subheader="Share with friends and earn rewards"
                            />
                            <CardContent>
                                {!generated ? (
                                    <Box sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Generate your unique referral code
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            onClick={handleGenerateCode}
                                            startIcon={<ShareIcon />}
                                        >
                                            Generate Code
                                        </Button>
                                    </Box>
                                ) : (
                                    <Box>
                                        <Paper variant="outlined" sx={{ p: 3, mb: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                                            <Typography variant="h3" fontWeight="bold" color="primary">
                                                {referralCode}
                                            </Typography>
                                            <Tooltip title="Copy code">
                                                <IconButton onClick={handleCopyCode} color="primary">
                                                    <CopyIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Paper>

                                        <TextField
                                            fullWidth
                                            value={referralLink}
                                            label="Referral Link"
                                            InputProps={{
                                                readOnly: true,
                                                endAdornment: (
                                                    <Tooltip title="Copy link">
                                                        <IconButton onClick={handleCopyLink} edge="end">
                                                            <CopyIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                ),
                                            }}
                                            sx={{ mb: 2 }}
                                        />

                                        <Typography variant="subtitle2" gutterBottom>
                                            Share via
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                variant="outlined"
                                                startIcon={<WhatsApp />}
                                                onClick={() => handleShare('whatsapp')}
                                                color="success"
                                            >
                                                WhatsApp
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                startIcon={<Email />}
                                                onClick={() => handleShare('email')}
                                            >
                                                Email
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                startIcon={<Sms />}
                                                onClick={() => handleShare('sms')}
                                            >
                                                SMS
                                            </Button>
                                        </Box>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Stats Overview */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardHeader
                                title="Your Performance"
                                avatar={getTierIcon(stats?.currentTier || 'bronze')}
                                action={
                                    <Chip
                                        label={`${stats?.currentTier?.toUpperCase()} Tier`}
                                        sx={{ bgcolor: getTierColor(stats?.currentTier || 'bronze'), color: 'white' }}
                                    />
                                }
                            />
                            <CardContent>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h3" color="primary">
                                                {stats?.totalReferrals || 0}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Total Referrals
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h3" color="success.main">
                                                {stats?.completedReferrals || 0}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Completed
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h3" color="secondary">
                                                ₹{stats?.totalEarned || 0}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Total Earned
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h3" color="warning.main">
                                                ₹{stats?.pendingRewards || 0}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Pending Rewards
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 2 }} />

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2">Conversion Rate</Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        {stats?.conversationRate || 0}%
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2">Leaderboard Rank</Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        #{stats?.rank || '-'}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* How It Works */}
                    <Grid item xs={12}>
                        <Card>
                            <CardHeader title="How Referral Rewards Work" />
                            <CardContent>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={3}>
                                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                            <Avatar sx={{ bgcolor: 'bronze', mx: 'auto', mb: 1 }}>🥉</Avatar>
                                            <Typography variant="h6">Bronze</Typography>
                                            <Typography variant="caption">1-4 referrals</Typography>
                                            <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                                                ₹100 per referral
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                            <Avatar sx={{ bgcolor: '#C0C0C0', mx: 'auto', mb: 1 }}>🥈</Avatar>
                                            <Typography variant="h6">Silver</Typography>
                                            <Typography variant="caption">5-9 referrals</Typography>
                                            <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                                                ₹150 per referral
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                            <Avatar sx={{ bgcolor: '#FFD700', mx: 'auto', mb: 1 }}>🥇</Avatar>
                                            <Typography variant="h6">Gold</Typography>
                                            <Typography variant="caption">10-24 referrals</Typography>
                                            <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                                                ₹200 per referral
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                            <Avatar sx={{ bgcolor: '#E5E4E2', mx: 'auto', mb: 1 }}>💎</Avatar>
                                            <Typography variant="h6">Platinum</Typography>
                                            <Typography variant="caption">25+ referrals</Typography>
                                            <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                                                ₹300 per referral
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>

                                <Alert severity="info" sx={{ mt: 2 }}>
                                    <Typography variant="body2">
                                        <strong>Bonus:</strong> Your referred friends also get ₹50-150 welcome rewards!
                                    </Typography>
                                </Alert>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};
