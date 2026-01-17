import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    TextField,
    Button,
    Box,
    Chip,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Slider,
    Typography,
    IconButton,
    Collapse,
    Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
} from '@mui/material';
import {
    Search,
    FilterList,
    Clear,
    Save,
    Star,
    StarBorder,
    Delete,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';

interface SearchFilters {
    status?: string[];
    client_ids?: string[];
    amount_min?: number;
    amount_max?: number;
    date_from?: Date | null;
    date_to?: Date | null;
    overdue_only?: boolean;
    full_text?: string;
}

interface SavedSearch {
    id: string;
    name: string;
    filters: SearchFilters;
    is_favorite: boolean;
}

interface Props {
    onSearch: (filters: SearchFilters) => void;
    onClear: () => void;
}

export const AdvancedSearchPanel: React.FC<Props> = ({ onSearch, onClear }) => {
    const [expanded, setExpanded] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>({});
    const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [newSearchName, setNewSearchName] = useState('');

    useEffect(() => {
        loadSavedSearches();
    }, []);

    const loadSavedSearches = async () => {
        try {
            const response = await fetch('/api/v1/searches');
            const data = await response.json();
            setSavedSearches(data);
        } catch (error) {
            console.error('Failed to load saved searches:', error);
        }
    };

    const handleSearch = () => {
        onSearch(filters);
    };

    const handleClear = () => {
        setFilters({});
        onClear();
    };

    const handleSaveSearch = async () => {
        try {
            await fetch('/api/v1/searches/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newSearchName, filters }),
            });
            setSaveDialogOpen(false);
            setNewSearchName('');
            loadSavedSearches();
        } catch (error) {
            console.error('Failed to save search:', error);
        }
    };

    const handleLoadSavedSearch = async (searchId: string) => {
        try {
            const response = await fetch(`/api/v1/searches/${searchId}/execute`);
            const data = await response.json();
            const search = savedSearches.find((s) => s.id === searchId);
            if (search) {
                setFilters(search.filters);
                onSearch(search.filters);
            }
        } catch (error) {
            console.error('Failed to load search:', error);
        }
    };

    const handleToggleFavorite = async (searchId: string, isFavorite: boolean) => {
        try {
            await fetch(`/api/v1/searches/${searchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_favorite: !isFavorite }),
            });
            loadSavedSearches();
        } catch (error) {
            console.error('Failed to update favorite:', error);
        }
    };

    const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== null && v !== '').length;

    return (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <CardContent>
                {/* Quick Search */}
                <Box display="flex" gap={2} mb={2}>
                    <TextField
                        fullWidth
                        placeholder="Search invoices by number, client, or notes..."
                        value={filters.full_text || ''}
                        onChange={(e) => setFilters({ ...filters, full_text: e.target.value })}
                        InputProps={{
                            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                            endAdornment: filters.full_text && (
                                <IconButton size="small" onClick={() => setFilters({ ...filters, full_text: '' })}>
                                    <Clear />
                                </IconButton>
                            ),
                        }}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button
                        variant="outlined"
                        onClick={() => setExpanded(!expanded)}
                        startIcon={<FilterList />}
                        sx={{ minWidth: 150 }}
                    >
                        Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </Button>
                </Box>

                {/* Advanced Filters */}
                <Collapse in={expanded}>
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                        <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={2}>
                            {/* Status Filter */}
                            <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    multiple
                                    value={filters.status || []}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value as string[] })}
                                    renderValue={(selected) => (
                                        <Box display="flex" gap={0.5} flexWrap="wrap">
                                            {(selected as string[]).map((value) => (
                                                <Chip key={value} label={value} size="small" />
                                            ))}
                                        </Box>
                                    )}
                                >
                                    <MenuItem value="draft">Draft</MenuItem>
                                    <MenuItem value="sent">Sent</MenuItem>
                                    <MenuItem value="paid">Paid</MenuItem>
                                    <MenuItem value="overdue">Overdue</MenuItem>
                                    <MenuItem value="cancelled">Cancelled</MenuItem>
                                </Select>
                            </FormControl>

                            {/* Amount Range */}
                            <Box>
                                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                    Amount Range (₹)
                                </Typography>
                                <Box display="flex" gap={1}>
                                    <TextField
                                        size="small"
                                        type="number"
                                        placeholder="Min"
                                        value={filters.amount_min || ''}
                                        onChange={(e) =>
                                            setFilters({ ...filters, amount_min: parseFloat(e.target.value) || undefined })
                                        }
                                    />
                                    <TextField
                                        size="small"
                                        type="number"
                                        placeholder="Max"
                                        value={filters.amount_max || ''}
                                        onChange={(e) =>
                                            setFilters({ ...filters, amount_max: parseFloat(e.target.value) || undefined })
                                        }
                                    />
                                </Box>
                            </Box>

                            {/* Date Range */}
                            <Box>
                                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                    Date Range
                                </Typography>
                                <Box display="flex" gap={1}>
                                    <DatePicker
                                        label="From"
                                        value={filters.date_from}
                                        onChange={(date) => setFilters({ ...filters, date_from: date })}
                                        slotProps={{ textField: { size: 'small' } }}
                                    />
                                    <DatePicker
                                        label="To"
                                        value={filters.date_to}
                                        onChange={(date) => setFilters({ ...filters, date_to: date })}
                                        slotProps={{ textField: { size: 'small' } }}
                                    />
                                </Box>
                            </Box>
                        </Box>

                        {/* Action Buttons */}
                        <Box display="flex" justifyContent="space-between" mt={2}>
                            <Button startIcon={<Clear />} onClick={handleClear}>
                                Clear All
                            </Button>
                            <Box display="flex" gap={1}>
                                <Button startIcon={<Save />} onClick={() => setSaveDialogOpen(true)}>
                                    Save Search
                                </Button>
                                <Button variant="contained" onClick={handleSearch}>
                                    Search
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Collapse>

                {/* Active Filters Chips */}
                {activeFilterCount > 0 && (
                    <Box display="flex" gap={1} flexWrap="wrap">
                        {filters.status?.map((status) => (
                            <Chip
                                key={status}
                                label={`Status: ${status}`}
                                onDelete={() =>
                                    setFilters({
                                        ...filters,
                                        status: filters.status?.filter((s) => s !== status),
                                    })
                                }
                                size="small"
                            />
                        ))}
                        {filters.amount_min && (
                            <Chip
                                label={`Min: ₹${filters.amount_min}`}
                                onDelete={() => setFilters({ ...filters, amount_min: undefined })}
                                size="small"
                            />
                        )}
                        {filters.amount_max && (
                            <Chip
                                label={`Max: ₹${filters.amount_max}`}
                                onDelete={() => setFilters({ ...filters, amount_max: undefined })}
                                size="small"
                            />
                        )}
                    </Box>
                )}

                {/* Saved Searches */}
                {savedSearches.length > 0 && (
                    <Box mt={2}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                            SAVED SEARCHES
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                            {savedSearches
                                .filter((s) => s.is_favorite)
                                .map((search) => (
                                    <Chip
                                        key={search.id}
                                        icon={<Star sx={{ fontSize: 16 }} />}
                                        label={search.name}
                                        onClick={() => handleLoadSavedSearch(search.id)}
                                        variant="outlined"
                                    />
                                ))}
                            {savedSearches
                                .filter((s) => !s.is_favorite)
                                .slice(0, 5)
                                .map((search) => (
                                    <Chip
                                        key={search.id}
                                        label={search.name}
                                        onClick={() => handleLoadSavedSearch(search.id)}
                                        variant="outlined"
                                    />
                                ))}
                        </Box>
                    </Box>
                )}
            </CardContent>

            {/* Save Search Dialog */}
            <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Save Search</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Search Name"
                        value={newSearchName}
                        onChange={(e) => setNewSearchName(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveSearch} disabled={!newSearchName}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};
