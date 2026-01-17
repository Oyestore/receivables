import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiFolder, FiDownload, FiFileText, FiCalendar, FiTag } from 'react-icons/fi';
import './DocumentCenter.css';

interface Document {
    id: string;
    invoiceNumber: string;
    vendor: string;
    type: 'receipt' | 'invoice' | 'tax_statement';
    date: Date;
    amount: number;
    downloadUrl: string;
    category?: string;
}

interface DocumentCenterProps {
    customerId: string;
}

const DocumentCenter: React.FC<DocumentCenterProps> = ({ customerId }) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        fetchDocuments();
    }, [customerId, selectedYear]);

    const fetchDocuments = () => {
        // Mock documents
        const mockDocs: Document[] = [
            {
                id: 'doc1',
                invoiceNumber: 'INV-001',
                vendor: 'ABC Consulting',
                type: 'receipt',
                date: new Date('2025-12-10'),
                amount: 50000,
                downloadUrl: '/receipts/inv-001.pdf',
                category: 'Consulting',
            },
            {
                id: 'doc2',
                invoiceNumber: 'INV-002',
                vendor: 'XYZ Services',
                type: 'invoice',
                date: new Date('2025-12-08'),
                amount: 75000,
                downloadUrl: '/invoices/inv-002.pdf',
                category: 'Technology',
            },
            {
                id: 'doc3',
                invoiceNumber: 'GST-2025-Q4',
                vendor: 'Tax Department',
                type: 'tax_statement',
                date: new Date('2025-12-01'),
                amount: 0,
                downloadUrl: '/tax/gst-2025-q4.pdf',
                category: 'Tax',
            },
            {
                id: 'doc4',
                invoiceNumber: 'INV-003',
                vendor: 'Global Solutions',
                type: 'receipt',
                date: new Date('2025-11-25'),
                amount: 120000,
                downloadUrl: '/receipts/inv-003.pdf',
                category: 'Infrastructure',
            },
            {
                id: 'doc5',
                invoiceNumber: 'INV-004',
                vendor: 'Tech Support',
                type: 'invoice',
                date: new Date('2025-11-20'),
                amount: 25000,
                downloadUrl: '/invoices/inv-004.pdf',
                category: 'Support',
            },
        ];

        setDocuments(mockDocs);
    };

    const handleDownload = (doc: Document) => {
        setToastMessage(`Downloading ${doc.invoiceNumber}`);
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        
        // Simulate download
        const link = document.createElement('a');
        link.href = doc.downloadUrl;
        link.download = `${doc.invoiceNumber}.pdf`;
        link.click();
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'receipt':
                return 'green';
            case 'invoice':
                return 'blue';
            case 'tax_statement':
                return 'purple';
            default:
                return 'gray';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'receipt':
                return '🧾';
            case 'invoice':
                return '📄';
            case 'tax_statement':
                return '📊';
            default:
                return '📁';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getDocumentSize = (type: string) => {
        // Mock file sizes
        const sizes = {
            receipt: '245 KB',
            invoice: '312 KB',
            tax_statement: '1.2 MB',
        };
        return sizes[type as keyof typeof sizes] || '256 KB';
    };

    // Filter documents based on active tab, category, and search
    const filteredDocuments = documents.filter(doc => {
        const matchesTab = activeTab === 'all' || doc.type === activeTab;
        const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        const matchesSearch = searchQuery === '' || 
            doc.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.vendor.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesTab && matchesCategory && matchesSearch;
    });

    const categories: string[] = ['all', ...Array.from(new Set(documents.map(doc => doc.category).filter((cat): cat is string => Boolean(cat))))];
    const years = [2025, 2024, 2023];

    const receiptCount = documents.filter(doc => doc.type === 'receipt').length;
    const invoiceCount = documents.filter(doc => doc.type === 'invoice').length;
    const taxCount = documents.filter(doc => doc.type === 'tax_statement').length;
    const totalAmount = documents.reduce((sum, doc) => sum + doc.amount, 0);

    return (
        <div className="document-center">
            <VStack gap={6} align="stretch">
                {/* Header */}
                <div className="document-header">
                    <h2 className="document-title">
                        <Icon as={FiFolder} className="icon mr-2" />
                        Document Center
                    </h2>
                    <div className="document-actions">
                        <select
                            className="button button-outline button-sm"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <button className="button button-blue button-sm">
                            <Icon as={FiDownload} className="icon mr-1" />
                            Export All
                        </button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="document-stats">
                    <div className="stat-card bg-gradient-to-br bg-blue-50 border-top-4 border-blue-500">
                        <div className="stat-value">{receiptCount}</div>
                        <div className="stat-label">Receipts</div>
                    </div>

                    <div className="stat-card bg-gradient-to-br bg-green-50 border-top-4 border-green-500">
                        <div className="stat-value">{invoiceCount}</div>
                        <div className="stat-label">Invoices</div>
                    </div>

                    <div className="stat-card bg-gradient-to-br bg-purple-50 border-top-4 border-purple-500">
                        <div className="stat-value">{taxCount}</div>
                        <div className="stat-label">Tax Statements</div>
                    </div>

                    <div className="stat-card bg-gradient-to-br bg-orange-50 border-top-4 border-orange-500">
                        <div className="stat-value">{formatCurrency(totalAmount)}</div>
                        <div className="stat-label">Total Value</div>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="search-bar">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="search-button">
                        Search
                    </button>
                </div>

                {/* Category Filter */}
                <div className="category-filter">
                    {categories.map(category => (
                        <button
                            key={category}
                            className={`category-button ${selectedCategory === category ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category === 'all' ? 'All Categories' : category}
                        </button>
                    ))}
                </div>

                {/* Tabs */}
                <div className="tabs">
                    <div className="tab-list">
                        <button
                            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            All Documents
                        </button>
                        <button
                            className={`tab ${activeTab === 'receipt' ? 'active' : ''}`}
                            onClick={() => setActiveTab('receipt')}
                        >
                            Receipts
                        </button>
                        <button
                            className={`tab ${activeTab === 'invoice' ? 'active' : ''}`}
                            onClick={() => setActiveTab('invoice')}
                        >
                            Invoices
                        </button>
                        <button
                            className={`tab ${activeTab === 'tax_statement' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tax_statement')}
                        >
                            Tax Statements
                        </button>
                    </div>
                </div>

                {/* Documents Table */}
                <div className="document-table">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Document</th>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Size</th>
                                <th>Category</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocuments.map((doc) => (
                                <tr key={doc.id} className="document-row">
                                    <td>
                                        <div className="document-name">
                                            <div className="h-stack gap-2">
                                                <span className="type-icon">{getTypeIcon(doc.type)}</span>
                                                <div>
                                                    <div className="font-medium">{doc.invoiceNumber}</div>
                                                    <div className="text text-xs color-gray-500">{doc.vendor}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <Badge className={`badge badge-${getTypeColor(doc.type)}`}>
                                            {doc.type.replace('_', ' ')}
                                        </Badge>
                                    </td>
                                    <td>
                                        <div className="document-date">
                                            <Icon as={FiCalendar} className="icon mr-1" />
                                            {formatDate(doc.date)}
                                        </div>
                                    </td>
                                    <td>
                                        {doc.amount > 0 ? formatCurrency(doc.amount) : '-'}
                                    </td>
                                    <td>
                                        <div className="document-size">
                                            {getDocumentSize(doc.type)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="h-stack gap-2">
                                            <Icon as={FiTag} className="icon" />
                                            <span>{doc.category || 'Uncategorized'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="document-actions">
                                            <button
                                                className="action-button"
                                                onClick={() => handleDownload(doc)}
                                                title="Download"
                                            >
                                                <Icon as={FiDownload} className="icon" />
                                            </button>
                                            <button
                                                className="action-button"
                                                title="View"
                                            >
                                                <Icon as={FiFileText} className="icon" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {filteredDocuments.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">📁</div>
                        <div className="empty-state-text">No documents found</div>
                        <div className="empty-state-subtext">
                            Try adjusting your search or filter criteria
                        </div>
                    </div>
                )}

                {/* Upload Area */}
                <div className="upload-area">
                    <div className="upload-icon">📤</div>
                    <div className="upload-text">Upload New Document</div>
                    <div className="upload-subtext">
                        Drag and drop files here, or click to browse
                    </div>
                    <button className="upload-button">
                        Choose Files
                    </button>
                </div>
            </VStack>

            {/* Toast Notification */}
            {showToast && (
                <div className={`toast toast-${toastType}`}>
                    <div className="toast-title">
                        {toastType === 'success' ? 'Success' : 'Error'}
                    </div>
                    <div className="toast-message">{toastMessage}</div>
                </div>
            )}
        </div>
    );
};

export default DocumentCenter;
