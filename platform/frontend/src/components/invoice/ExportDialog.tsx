import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlRadioButton,
    Checkbox,
    FormControlLabel,
    Box,
    Typography,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    PictureAsPdf,
    TableChart,
    Code,
    Description,
    Download,
} from '@mui/icons-material';

interface Props {
    open: boolean;
    onClose: () => void;
    selectedInvoiceIds: string[];
}

export const ExportDialog: React.FC<Props> = ({ open, onClose, selectedInvoiceIds }) => {
    const [format, setFormat] = useState<'pdf' | 'excel' | 'csv' | 'json' | 'xml'>('pdf');
    const [includeLineItems, setIncludeLineItems] = useState(true);
    const [includePayments, setIncludePayments] = useState(true);
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);

        try {
            const response = await fetch('/api/v1/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoice_ids: selectedInvoiceIds,
                    format,
                    options: {
                        include_line_items: includeLineItems,
                        include_payments: includePayments,
                    },
                }),
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoices-export.${format === 'excel' ? 'xlsx' : format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            onClose();
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setExporting(false);
        }
    };

    const formatOptions = [
        { value: 'pdf', label: 'PDF', icon: <PictureAsPdf /> },
        { value: 'excel', label: 'Excel', icon: <TableChart /> },
        { value: 'csv', label: 'CSV', icon: <Description /> },
        { value: 'json', label: 'JSON', icon: <Code /> },
        { value: 'xml', label: 'XML', icon: <Code /> },
    ];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Export Invoices</DialogTitle>
            <DialogContent>
                <Alert severity="info" sx={{ mb: 3 }}>
                    Exporting {selectedInvoiceIds.length} invoice(s)
                </Alert>

                <FormControl component="fieldset" fullWidth>
                    <FormLabel>Format</FormLabel>
                    <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={1} mt={1}>
                        {formatOptions.map((option) => (
                            <Box
                                key={option.value}
                                sx={{
                                    p: 2,
                                    border: '2px solid',
                                    borderColor: format === option.value ? 'primary.main' : 'divider',
                                    borderRadius: 1,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        bgcolor: 'action.hover',
                                    },
                                }}
                                onClick={() => setFormat(option.value as any)}
                            >
                                {option.icon}
                                <Typography>{option.label}</Typography>
                            </Box>
                        ))}
                    </Box>
                </FormControl>

                <Box mt={3}>
                    <FormLabel>Include</FormLabel>
                    <Box mt={1}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={includeLineItems}
                                    onChange={(e) => setIncludeLineItems(e.target.checked)}
                                />
                            }
                            label="Line items"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={includePayments}
                                    onChange={(e) => setIncludePayments(e.target.checked)}
                                />
                            }
                            label="Payment history"
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={exporting}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleExport}
                    disabled={exporting}
                    startIcon={exporting ? <CircularProgress size={20} /> : <Download />}
                >
                    {exporting ? 'Exporting...' : `Export ${selectedInvoiceIds.length} Invoice(s)`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
