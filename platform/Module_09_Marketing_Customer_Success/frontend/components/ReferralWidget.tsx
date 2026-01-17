import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    Button,
    Typography,
    Box,
    Grid,
    Alert,
    TextField,
    IconButton,
    Tooltip,
    Snackbar
} from '@mui/material';
import {
    Share as ShareIcon,
    ContentCopy as CopyIcon,
    WhatsApp as WhatsAppIcon,
    Email as EmailIcon,
    Message as SmsIcon,
    Facebook as FacebookIcon,
    Twitter as TwitterIcon,
    LinkedIn as LinkedInIcon
} from '@mui/icons-material';

interface ReferralWidgetProps {
    userId: string;
    userName?: string;
}

interface ReferralStats {
    totalReferrals: number;
    successfulReferrals: number;
    pendingReferrals: number;
    totalRewards: number;
}

export const ReferralWidget: React.FC<ReferralWidgetProps> = ({
    userId,
    userName = 'User'
}) => {
    const [referralLink, setReferralLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<ReferralStats>({
        totalReferrals: 0,
        successfulReferrals: 0,
        pendingReferrals: 0,
        totalRewards: 0
    });
    const [copySuccess, setCopySuccess] = useState(false);
    const [customMessage, setCustomMessage] = useState('');

    useEffect(() => {
        generateReferralLink();
        // fetchStats(); // Would fetch real stats from API
    }, [userId]);

    const generateReferralLink = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/referrals/link/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setReferralLink(data.link);
            } else {
                // Fallback to generated link
                setReferralLink(`https://platform.com/signup?ref=${userId}`);
            }
        } catch (error) {
            setReferralLink(`https://platform.com/signup?ref=${userId}`);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        setCopySuccess(true);
    };

    const shareViaWhatsApp = () => {
        const message = customMessage ||
            `Hey! I've been using this amazing receivables management platform. Join using my link and we both get rewards! ${referralLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const shareViaEmail = () => {
        const subject = 'Join me on this amazing platform!';
        const body = customMessage ||
            `Hi,\n\nI've been using this great receivables management platform and thought you might be interested.\n\nJoin using my referral link: ${referralLink}\n\nWe'll both get rewards when you sign up!\n\nBest regards,\n${userName}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const shareViaSMS = () => {
        const message = `Check out this platform: ${referralLink}`;
        window.open(`sms:?body=${encodeURIComponent(message)}`);
    };

    const shareViaFacebook = () => {
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
            '_blank'
        );
    };

    const shareViaTwitter = () => {
        const text = customMessage || 'Join me on this amazing receivables management platform!';
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`,
            '_blank'
        );
    };

    const shareViaLinkedIn = () => {
        window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
            '_blank'
        );
    };

    return (
        <Card elevation={3}>
            <CardHeader
                avatar={<ShareIcon color="primary" />}
                title="Refer & Earn"
                subheader="Share the platform and earn rewards"
            />
            <CardContent>
                <Grid container spacing={3}>
                    {/* Stats Overview */}
                    <Grid item xs={12}>
                        <Grid container spacing={2}>
                            <Grid item xs={6} md={3}>
                                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                                    <Typography variant="h4" color="primary.dark">
                                        {stats.totalReferrals}
                                    </Typography>
                                    <Typography variant="caption" color="primary.dark">
                                        Total Referrals
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                                    <Typography variant="h4" color="success.dark">
                                        {stats.successfulReferrals}
                                    </Typography>
                                    <Typography variant="caption" color="success.dark">
                                        Successful
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                                    <Typography variant="h4" color="warning.dark">
                                        {stats.pendingReferrals}
                                    </Typography>
                                    <Typography variant="caption" color="warning.dark">
                                        Pending
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.light', borderRadius: 1 }}>
                                    <Typography variant="h4" color="secondary.dark">
                                        ₹{stats.totalRewards.toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" color="secondary.dark">
                                        Total Rewards
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Referral Link */}
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            Your Referral Link
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                fullWidth
                                value={referralLink}
                                InputProps={{
                                    readOnly: true,
                                    endAdornment: (
                                        <Tooltip title="Copy link">
                                            <IconButton onClick={copyToClipboard} edge="end">
                                                <CopyIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )
                                }}
                                disabled={loading}
                            />
                        </Box>
                    </Grid>

                    {/* Custom Message */}
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Customize your message (optional)"
                            placeholder="Add a personal touch to your referral..."
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                        />
                    </Grid>

                    {/* Share Buttons */}
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            Share Via
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Tooltip title="Share on WhatsApp">
                                <Button
                                    variant="outlined"
                                    startIcon={<WhatsAppIcon />}
                                    onClick={shareViaWhatsApp}
                                    sx={{ bgcolor: '#25D366', color: 'white', '&:hover': { bgcolor: '#1da851' } }}
                                >
                                    WhatsApp
                                </Button>
                            </Tooltip>

                            <Tooltip title="Share via Email">
                                <Button
                                    variant="outlined"
                                    startIcon={<EmailIcon />}
                                    onClick={shareViaEmail}
                                >
                                    Email
                                </Button>
                            </Tooltip>

                            <Tooltip title="Share via SMS">
                                <Button
                                    variant="outlined"
                                    startIcon={<SmsIcon />}
                                    onClick={shareViaSMS}
                                >
                                    SMS
                                </Button>
                            </Tooltip>

                            <Tooltip title="Share on Facebook">
                                <Button
                                    variant="outlined"
                                    startIcon={<FacebookIcon />}
                                    onClick={shareViaFacebook}
                                    sx={{ bgcolor: '#1877F2', color: 'white', '&:hover': { bgcolor: '#145dbf' } }}
                                >
                                    Facebook
                                </Button>
                            </Tooltip>

                            <Tooltip title="Share on Twitter">
                                <Button
                                    variant="outlined"
                                    startIcon={<TwitterIcon />}
                                    onClick={shareViaTwitter}
                                    sx={{ bgcolor: '#1DA1F2', color: 'white', '&:hover': { bgcolor: '#1a8cd8' } }}
                                >
                                    Twitter
                                </Button>
                            </Tooltip>

                            <Tooltip title="Share on LinkedIn">
                                <Button
                                    variant="outlined"
                                    startIcon={<LinkedInIcon />}
                                    onClick={shareViaLinkedIn}
                                    sx={{ bgcolor: '#0A66C2', color: 'white', '&:hover': { bgcolor: '#004182' } }}
                                >
                                    LinkedIn
                                </Button>
                            </Tooltip>
                        </Box>
                    </Grid>

                    {/* Rewards Info */}
                    <Grid item xs={12}>
                        <Alert severity="success">
                            🎁 <strong>Earn ₹500</strong> for each successful referral! Your friend gets ₹500 too.
                        </Alert>
                    </Grid>

                    {/* How it Works */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                            How it works:
                        </Typography>
                        <Box component="ol" sx={{ pl: 2, m: 0 }}>
                            <Typography component="li" variant="body2" gutterBottom>
                                Share your unique referral link with friends
                            </Typography>
                            <Typography component="li" variant="body2" gutterBottom>
                                They sign up using your link
                            </Typography>
                            <Typography component="li" variant="body2" gutterBottom>
                                When they create their first invoice, you both get ₹500!
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>

            {/* Success Snackbar */}
            <Snackbar
                open={copySuccess}
                autoHideDuration={3000}
                onClose={() => setCopySuccess(false)}
                message="Link copied to clipboard!"
            />
        </Card>
    );
};

export default ReferralWidget;
