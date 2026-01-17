import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    Rating,
    Chip,
    Avatar,
} from '@mui/material';
import {
    Search as SearchIcon,
    LocationOn as LocationIcon,
    Work as WorkIcon,
    Gavel as GavelIcon,
} from '@mui/icons-material';
import legalApi from '../../services/legalApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function LawyerDirectory() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [specializationFilter, setSpecializationFilter] = useState('');
    const [cityFilter, setCityFilter] = useState('');

    const { data: lawyers, isLoading } = useQuery({
        queryKey: ['lawyers', specializationFilter, cityFilter],
        queryFn: () => legalApi.getAll({
            specialization: specializationFilter || undefined,
            city: cityFilter || undefined,
        }),
    });

    if (isLoading) {
        return <LoadingSpinner message="Loading lawyer directory..." />;
    }

    const filteredLawyers = lawyers?.filter(lawyer =>
        lawyer.firmName.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    Legal Network Directory
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Find and connect with verified legal professionals
                </Typography>
            </Box>

            {/* Search & Filters */}
            <Box sx={{ mb: 4 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                        placeholder="Search by name or firm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{ flexGrow: 1 }}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                    />
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Specialization</InputLabel>
                        <Select
                            value={specializationFilter}
                            onChange={(e) => setSpecializationFilter(e.target.value)}
                            label="Specialization"
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="civil_litigation">Civil Litigation</MenuItem>
                            <MenuItem value="commercial_disputes">Commercial Disputes</MenuItem>
                            <MenuItem value="debt_recovery">Debt Recovery</MenuItem>
                            <MenuItem value="contract_law">Contract Law</MenuItem>
                            <MenuItem value="arbitration">Arbitration</MenuItem>
                            <MenuItem value="mediation">Mediation</MenuItem>
                            <MenuItem value="msme_compliance">MSME Compliance</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>City</InputLabel>
                        <Select
                            value={cityFilter}
                            onChange={(e) => setCityFilter(e.target.value)}
                            label="City"
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="Mumbai">Mumbai</MenuItem>
                            <MenuItem value="Delhi">Delhi</MenuItem>
                            <MenuItem value="Bangalore">Bangalore</MenuItem>
                            <MenuItem value="Pune">Pune</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Box>

            {/* Lawyer Cards Grid */}
            {filteredLawyers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography color="text.secondary">
                        No lawyers found matching your criteria
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {filteredLawyers.map((lawyer) => (
                        <Grid item xs={12} sm={6} md={4} key={lawyer.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        boxShadow: '0 12px 24px rgba(0,0,0,0.4)',
                                    },
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1 }}>
                                    {/* Avatar & Name */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Avatar
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                bgcolor: 'primary.main',
                                                mr: 2,
                                                fontSize: '1.5rem',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {lawyer.firmName.charAt(0)}
                                        </Avatar>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                {lawyer.firmName}
                                            </Typography>
                                            <Chip
                                                label={lawyer.providerType}
                                                size="small"
                                                sx={{ mt: 0.5 }}
                                            />
                                        </Box>
                                    </Box>

                                    {/* Rating */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Rating value={lawyer.rating} precision={0.1} readOnly size="small" />
                                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                            ({lawyer.rating.toFixed(1)})
                                        </Typography>
                                    </Box>

                                    {/* Specializations */}
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                            Specializations
                                        </Typography>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                            {lawyer.specializations.slice(0, 2).map((spec) => (
                                                <Chip
                                                    key={spec}
                                                    label={spec.replace('_', ' ')}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontSize: '0.7rem' }}
                                                />
                                            ))}
                                            {lawyer.specializations.length > 2 && (
                                                <Chip
                                                    label={`+${lawyer.specializations.length - 2}`}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontSize: '0.7rem' }}
                                                />
                                            )}
                                        </Stack>
                                    </Box>

                                    {/* Stats */}
                                    <Grid container spacing={1} sx={{ mb: 2 }}>
                                        <Grid item xs={6}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                                    {lawyer.totalCasesHandled}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Cases
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                                                    {((lawyer.successfulResolutions / lawyer.totalCasesHandled) * 100).toFixed(0)}%
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Success
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>

                                    {/* Location & Experience */}
                                    <Stack spacing={0.5}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary">
                                                {lawyer.contactInfo.address.city}, {lawyer.contactInfo.address.state}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <WorkIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary">
                                                {lawyer.yearsOfExperience} years experience
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>

                                <CardActions sx={{ p: 2, pt: 0 }}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={() => navigate(`/legal/lawyers/${lawyer.id}`)}
                                    >
                                        View Profile
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
}
