import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    LinearProgress,
    Grid,
    Card,
    CardContent,
    Chip,
    Avatar,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
} from '@mui/material';
import {
    EmojiEvents,
    TrendingUp,
    LocalFireDepartment,
    Star,
} from '@mui/icons-material';
import axios from 'axios';

interface UserStats {
    level: number;
    totalPoints: number;
    pointsToNextLevel: number;
    currentStreak: number;
    longestStreak: number;
    recentPoints: any[];
    achievements: any[];
}

const GamificationDashboard: React.FC<{ userId: string }> = ({ userId }) => {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [userId]);

    const loadStats = async () => {
        try {
            const response = await axios.get(`/api/v1/gamification/users/${userId}/stats`);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to load gamification stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return <Box p={3}>Loading...</Box>;
    }

    const levelProgress = ((stats.totalPoints - (stats.totalPoints - stats.pointsToNextLevel)) /
        (stats.totalPoints + stats.pointsToNextLevel)) * 100;

    return (
        <Box p={3}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
                Your Progress
            </Typography>

            {/* Level Card */}
            <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <Grid container alignItems="center" spacing={2}>
                    <Grid item>
                        <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)' }}>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.level}
                            </Typography>
                        </Avatar>
                    </Grid>
                    <Grid item xs>
                        <Typography variant="h6" fontWeight="bold">
                            Level {stats.level}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            {stats.totalPoints.toLocaleString()} total points
                        </Typography>
                        <Box mt={1}>
                            <LinearProgress
                                variant="determinate"
                                value={levelProgress}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: 'white',
                                    },
                                }}
                            />
                            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                                {stats.pointsToNextLevel} points to Level {stats.level + 1}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Stats Grid */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <TrendingUp color="primary" />
                                <Typography variant="h6" fontWeight="bold">
                                    {stats.totalPoints.toLocaleString()}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Total Points
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <LocalFireDepartment sx={{ color: '#ff6b6b' }} />
                                <Typography variant="h6" fontWeight="bold">
                                    {stats.currentStreak}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Current Streak
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Star sx={{ color: '#ffd700' }} />
                                <Typography variant="h6" fontWeight="bold">
                                    {stats.longestStreak}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Longest Streak
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <EmojiEvents sx={{ color: '#4caf50' }} />
                                <Typography variant="h6" fontWeight="bold">
                                    {stats.achievements.filter((a) => a.isUnlocked).length}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Achievements
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Achievements */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Achievements
                </Typography>
                <Grid container spacing={2}>
                    {stats.achievements.slice(0, 6).map((achievement) => (
                        <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                            <Card
                                sx={{
                                    opacity: achievement.isUnlocked ? 1 : 0.5,
                                    border: achievement.isUnlocked ? '2px solid #4caf50' : 'none',
                                }}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Avatar
                                            sx={{
                                                bgcolor: achievement.isUnlocked ? '#4caf50' : 'grey.300',
                                            }}
                                        >
                                            <EmojiEvents />
                                        </Avatar>
                                        <Box flex={1}>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                {achievement.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {achievement.description}
                                            </Typography>
                                            {!achievement.isUnlocked && (
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={(achievement.progress / achievement.requirementValue) * 100}
                                                    sx={{ mt: 1 }}
                                                />
                                            )}
                                        </Box>
                                        {achievement.isUnlocked && (
                                            <Chip label="Unlocked" color="success" size="small" />
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            {/* Recent Activity */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Recent Activity
                </Typography>
                <List>
                    {stats.recentPoints.map((point, index) => (
                        <ListItem key={index}>
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'primary.main' }}>
                                    <Star />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={point.description}
                                secondary={new Date(point.createdAt).toLocaleDateString()}
                            />
                            <Chip label={`+${point.points}`} color="primary" size="small" />
                        </ListItem>
                    ))}
                </List>
            </Paper>
        </Box>
    );
};

export default GamificationDashboard;
