import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    Chip,
    Tab,
    Tabs,
} from '@mui/material';
import { EmojiEvents, TrendingUp, LocalFireDepartment } from '@mui/icons-material';
import axios from 'axios';

const LeaderboardWidget: React.FC = () => {
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        try {
            const response = await axios.get('/api/v1/gamification/leaderboard?limit=10');
            setLeaderboard(response.data);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankColor = (rank: number) => {
        if (rank === 1) return '#FFD700';
        if (rank === 2) return '#C0C0C0';
        if (rank === 3) return '#CD7F32';
        return 'transparent';
    };

    const getRankIcon = (rank: number) => {
        if (rank <= 3) {
            return <EmojiEvents sx={{ color: getRankColor(rank) }} />;
        }
        return rank;
    };

    return (
        <Box>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                    🏆 Leaderboard
                </Typography>

                <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
                    <Tab label="All Time" />
                    <Tab label="This Month" />
                    <Tab label="This Week" />
                </Tabs>

                {loading ? (
                    <Typography>Loading...</Typography>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Rank</TableCell>
                                    <TableCell>User</TableCell>
                                    <TableCell align="right">Level</TableCell>
                                    <TableCell align="right">Points</TableCell>
                                    <TableCell align="right">Streak</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {leaderboard.map((entry, index) => (
                                    <TableRow
                                        key={entry.id}
                                        sx={{
                                            '&:hover': { bgcolor: 'action.hover' },
                                            bgcolor: index < 3 ? 'action.selected' : 'transparent',
                                        }}
                                    >
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                {getRankIcon(index + 1)}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={2}>
                                                <Avatar>{entry.user?.name?.[0] || 'U'}</Avatar>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {entry.user?.name || 'User'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Chip
                                                label={`Level ${entry.currentLevel}`}
                                                size="small"
                                                color="primary"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight="bold">
                                                {entry.totalPoints.toLocaleString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                                                <LocalFireDepartment
                                                    sx={{ fontSize: 16, color: entry.currentStreak > 0 ? '#ff6b6b' : 'grey.400' }}
                                                />
                                                <Typography variant="body2">{entry.currentStreak}</Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
};

export default LeaderboardWidget;
