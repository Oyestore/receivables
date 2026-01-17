import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Paper,
    Avatar,
    LinearProgress,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    HourglassEmpty as PendingIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface Referral {
    id: string;
    referralCode: string;
    status: string;
    signedUpAt: string;
    completedAt: string;
    referrerRewardAmount: number;
    createdAt: string;
}

export const ReferralTracker: React.FC = () => {
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReferrals();
    }, []);

    const loadReferrals = async () => {
        try {
            setLoading(true);
            const userId = 'current-user-id'; // TODO: Get from auth context
            const response = await axios.get(`/api/v1/referrals/my-referrals/${userId}`);
            setReferrals(response.data);
        } catch (error) {
            console.error('Failed to load referrals:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
            case 'rewarded':
                return 'success';
            case 'pending':
                return 'warning';
            case 'expired':
            case 'fraud':
                return 'error';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
            case 'rewarded':
                return <CheckCircleIcon color="success" />;
            case 'pending':
                return <PendingIcon color="warning" />;
            default:
                return <CancelIcon color="error" />;
        }
    };

    const formatDate = (date: string) => {
        return date ? new Date(date).toLocaleDateString() : '-';
    };

    return (
        <Card>
            <CardHeader
                title="Referral Activity"
                subheader={`${referrals.length} total referrals`}
            />
            <CardContent>
                {loading ? (
                    <LinearProgress />
                ) : referrals.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            No referrals yet. Start sharing your code!
                        </Typography>
                    </Box>
                ) : (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Sign Up</TableCell>
                                    <TableCell>Completed</TableCell>
                                    <TableCell align="right">Reward</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {referrals.map((referral) => (
                                    <TableRow key={referral.id} hover>
                                        <TableCell>
                                            {formatDate(referral.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={getStatusIcon(referral.status)}
                                                label={referral.status}
                                                color={getStatusColor(referral.status) as any}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {formate(referral.signedUpAt)}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(referral.completedAt)}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography
                                                variant="body2"
                                                fontWeight="bold"
                                                color={referral.referrerRewardAmount > 0 ? 'success.main' : 'text.secondary'}
                                            >
                                                ₹{referral.referrerRewardAmount || 0}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </CardContent>
        </Card>
    );
};
