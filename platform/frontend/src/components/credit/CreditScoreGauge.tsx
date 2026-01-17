import React from 'react';
import { Box, Typography, CircularProgress, useTheme } from '@mui/material';
import { CreditScore } from '../../types/credit';

interface CreditScoreGaugeProps {
    creditScore: CreditScore;
}

const getScoreColor = (rating: string) => {
    switch (rating) {
        case 'EXCELLENT':
            return 'success.main';
        case 'GOOD':
            return 'info.main';
        case 'FAIR':
            return 'warning.main';
        case 'POOR':
            return 'error.main';
        default:
            return 'text.secondary';
    }
};

export const CreditScoreGauge: React.FC<CreditScoreGaugeProps> = ({ creditScore }) => {
    const theme = useTheme();
    // Normalize score (300-900) to percentage (0-100)
    const normalizedValue = ((creditScore.score - 300) / (900 - 300)) * 100;

    return (
        <Box position="relative" display="inline-flex" flexDirection="column" alignItems="center">
            <Box position="relative">
                <CircularProgress
                    variant="determinate"
                    value={100}
                    size={180}
                    thickness={5}
                    sx={{ color: theme.palette.grey[200] }}
                />
                <CircularProgress
                    variant="determinate"
                    value={normalizedValue}
                    size={180}
                    thickness={5}
                    sx={{
                        color: getScoreColor(creditScore.rating),
                        position: 'absolute',
                        left: 0,
                        strokeLinecap: 'round',
                    }}
                />
                <Box
                    sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                    }}
                >
                    <Typography variant="h2" component="div" fontWeight="bold" color="text.primary">
                        {creditScore.score}
                    </Typography>
                    <Typography variant="h6" component="div" color="text.secondary">
                        {creditScore.rating}
                    </Typography>
                </Box>
            </Box>
            <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary' }}>
                Last updated: {new Date(creditScore.lastUpdated).toLocaleDateString()}
            </Typography>
        </Box>
    );
};
