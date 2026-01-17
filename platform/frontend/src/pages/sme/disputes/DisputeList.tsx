import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button } from '@mui/material';
import { disputeAPI } from '../../../config/api';
import { DisputeCase } from '../../../types/dispute';

const DisputeList: React.FC = () => {
    const { data: disputes = [], isLoading } = useQuery<DisputeCase[]>({
        queryKey: ['disputes'],
        queryFn: () => disputeAPI.getDisputes('defaultTenant').then((res) => res.data),
    });

    if (isLoading) return <Typography>Loading disputes...</Typography>;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4 }}>Resolution Center</Typography>

            <Paper>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Case ID</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>Reason</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {disputes.map((dispute) => (
                            <TableRow key={dispute.id}>
                                <TableCell>{dispute.id}</TableCell>
                                <TableCell>{dispute.customerName}</TableCell>
                                <TableCell>{dispute.reason}</TableCell>
                                <TableCell>
                                    <Chip label={dispute.status} color={dispute.status === 'RESOLVED' ? 'success' : 'warning'} />
                                </TableCell>
                                <TableCell>
                                    <Button size="small">View Details</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
};

export default DisputeList;
