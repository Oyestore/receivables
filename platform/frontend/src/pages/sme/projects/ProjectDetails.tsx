import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Stepper, Step, StepLabel, Button } from '@mui/material';
import { milestoneAPI } from '../../../config/api';
// Using any for MVP, ideally Milestone type
import { Milestone } from '../../../types/milestone';

const ProjectDetails: React.FC = () => {
    // Mock ID for now
    const projectId = 'PROJ-001';

    const { data: milestones = [], isLoading } = useQuery<Milestone[]>({
        queryKey: ['projectMilestones', projectId],
        queryFn: () => milestoneAPI.getProjectDetails('defaultTenant', projectId).then((res) => res.data),
    });

    if (isLoading) return <Typography>Loading timeline...</Typography>;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4 }}>Project Timeline</Typography>

            <Stepper orientation="vertical">
                {milestones.map((step) => (
                    <Step key={step.id} expanded active={step.status === 'IN_PROGRESS'}>
                        <StepLabel
                            optional={<Typography variant="caption">{new Date(step.dueDate).toLocaleDateString()}</Typography>}
                        >
                            {step.title} - ₹{step.amount}
                        </StepLabel>
                    </Step>
                ))}
            </Stepper>
        </Box>
    );
};

export default ProjectDetails;
