import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Card, CardContent, Grid, Button, Paper } from '@mui/material';
import { Add, Assignment, CheckCircle } from '@mui/icons-material';
import { milestoneAPI } from '../../../config/api';
import { Project } from '../../../types/milestone';

const ProjectList: React.FC = () => {
    const { data: projects = [], isLoading } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn: () => milestoneAPI.getProjects('defaultTenant').then((res) => res.data),
    });

    if (isLoading) return <Typography>Loading projects...</Typography>;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Active Projects</Typography>
                <Button variant="contained" startIcon={<Add />}>New Project</Button>
            </Box>

            <Grid container spacing={3}>
                {projects.map((project) => (
                    <Grid item xs={12} md={6} lg={4} key={project.id}>
                        <Card sx={{
                            '&:hover': { backgroundImage: 'linear-gradient(to right, #f8f9fa, #e9ecef)' }
                        }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>{project.name}</Typography>
                                <Typography color="text.secondary" gutterBottom>{project.clientName}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
                                    <Assignment color="primary" fontSize="small" />
                                    <Typography variant="body2">{project.totalValue.toLocaleString()}</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}

                {projects.length === 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">No active milestone-based projects.</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default ProjectList;
