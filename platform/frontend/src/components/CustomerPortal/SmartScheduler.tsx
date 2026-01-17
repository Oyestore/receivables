import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiClock, FiZap, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import './SmartScheduler.css';

interface PaymentSchedule {
    invoiceId: string;
    vendor: string;
    amount: number;
    dueDate: Date;
    aiRecommendedDate: Date;
    reason: string;
    savingsAmount?: number;
    confidence: number;
}

interface SmartSchedulerProps {
    customerId: string;
}

const SmartScheduler: React.FC<SmartSchedulerProps> = ({ customerId }) => {
    const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
    const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        generateSmartSchedules();
    }, [customerId]);

    const generateSmartSchedules = () => {
        // AI analyzes:
        // 1. Vendor early payment discounts
        // 2. Cash flow optimization
        // 3. Credit card rewards maximization
        // 4. Float optimization
        const mockSchedules: PaymentSchedule[] = [
            {
                invoiceId: 'inv1',
                vendor: 'ABC Consulting',
                amount: 50000,
                dueDate: new Date('2025-12-25'),
                aiRecommendedDate: new Date('2025-12-18'),
                reason: '2% early payment discount available (saves ₹1,000)',
                savingsAmount: 1000,
                confidence: 95,
            },
            {
                invoiceId: 'inv2',
                vendor: 'XYZ Services',
                amount: 45000,
                dueDate: new Date('2025-12-28'),
                aiRecommendedDate: new Date('2025-12-27'),
                reason: 'Pay 1 day before due to maximize float and avoid late fees',
                confidence: 88,
            },
            {
                invoiceId: 'inv3',
                vendor: 'Global Tech',
                amount: 75000,
                dueDate: new Date('2025-12-30'),
                aiRecommendedDate: new Date('2025-12-29'),
                reason: 'Align with credit card billing cycle for rewards',
                confidence: 92,
            },
            {
                invoiceId: 'inv4',
                vendor: 'Startup Inc',
                amount: 30000,
                dueDate: new Date('2025-12-20'),
                aiRecommendedDate: new Date('2025-12-19'),
                reason: 'Vendor prefers early payments for better relationship',
                confidence: 75,
            },
        ];

        setSchedules(mockSchedules);
    };

    const handleApplySchedule = (scheduleId: string) => {
        setToastMessage('Payment schedule applied successfully');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);

        setSchedules(prev => prev.filter(s => s.invoiceId !== scheduleId));
    };

    const handleApplyAllSchedules = () => {
        setToastMessage('All AI-recommended schedules applied');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);

        setSchedules([]);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
        });
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 90) return 'green';
        if (confidence >= 75) return 'blue';
        if (confidence >= 60) return 'orange';
        return 'red';
    };

    const getDaysUntilDue = (dueDate: Date) => {
        const today = new Date();
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const isOverdue = (dueDate: Date) => {
        return getDaysUntilDue(dueDate) < 0;
    };

    const filteredSchedules = schedules.filter(schedule => {
        if (selectedFilter === 'all') return true;
        if (selectedFilter === 'savings') return schedule.savingsAmount && schedule.savingsAmount > 0;
        if (selectedFilter === 'urgent') return getDaysUntilDue(schedule.dueDate) <= 3;
        if (selectedFilter === 'overdue') return isOverdue(schedule.dueDate);
        return true;
    });

    const totalSavings = schedules.reduce((sum, schedule) => sum + (schedule.savingsAmount || 0), 0);
    const averageConfidence = schedules.length > 0 
        ? Math.round(schedules.reduce((sum, schedule) => sum + schedule.confidence, 0) / schedules.length)
        : 0;

    // Calendar generation
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const generateCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const days = [];

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    const calendarDays = generateCalendarDays();
    const today = new Date().getDate();
    const isCurrentMonth = currentMonth.getMonth() === new Date().getMonth() && 
                          currentMonth.getFullYear() === new Date().getFullYear();

    return (
        <div className="scheduler-container">
            <VStack gap={6} align="stretch">
                {/* Header */}
                <div className="scheduler-header">
                    <h2 className="scheduler-title">
                        <Icon as={FiClock} className="icon mr-2" />
                        Smart Payment Scheduler
                    </h2>
                    <div className="scheduler-actions">
                        <button className="button button-blue button-sm" onClick={handleApplyAllSchedules}>
                            <Icon as={FiZap} className="icon mr-1" />
                            Apply All AI Recommendations
                        </button>
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="schedule-overview">
                    <div className="overview-card bg-gradient-to-br bg-blue-50 border-top-4 border-blue-500">
                        <div className="overview-value">{schedules.length}</div>
                        <div className="overview-label">Pending Schedules</div>
                        <div className="overview-change positive">
                            <Icon as={FiTrendingUp} className="icon mr-1" />
                            AI optimized
                        </div>
                    </div>

                    <div className="overview-card bg-gradient-to-br bg-green-50 border-top-4 border-green-500">
                        <div className="overview-value">{formatCurrency(totalSavings)}</div>
                        <div className="overview-label">Potential Savings</div>
                        <div className="overview-change positive">
                            <Icon as={FiTrendingUp} className="icon mr-1" />
                            From early payments
                        </div>
                    </div>

                    <div className="overview-card bg-gradient-to-br bg-purple-50 border-top-4 border-purple-500">
                        <div className="overview-value">{averageConfidence}%</div>
                        <div className="overview-label">AI Confidence</div>
                        <div className="overview-change positive">
                            <Icon as={FiTrendingUp} className="icon mr-1" />
                            High accuracy
                        </div>
                    </div>

                    <div className="overview-card bg-gradient-to-br bg-orange-50 border-top-4 border-orange-500">
                        <div className="overview-value">
                            {schedules.filter(s => isOverdue(s.dueDate)).length}
                        </div>
                        <div className="overview-label">Overdue</div>
                        <div className="overview-change negative">
                            <Icon as={FiClock} className="icon mr-1" />
                            Needs attention
                        </div>
                    </div>
                </div>

                {/* AI Alert */}
                <div className="alert alert-info">
                    <Icon as={FiZap} className="alert-icon" />
                    <div className="alert-content">
                        <div className="alert-title">AI-Powered Scheduling Active</div>
                        <div className="alert-description">
                            Our AI analyzes vendor patterns, cash flow, and payment terms to optimize your payment schedule for maximum savings and efficiency.
                        </div>
                    </div>
                </div>

                {/* Calendar View */}
                <div className="schedule-calendar">
                    <div className="calendar-header">
                        <h3 className="calendar-title">
                            <Icon as={FiCalendar} className="icon mr-1" />
                            {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </h3>
                        <div className="calendar-navigation">
                            <button className="calendar-nav-button" onClick={() => {
                                const prevMonth = new Date(currentMonth);
                                prevMonth.setMonth(prevMonth.getMonth() - 1);
                                setCurrentMonth(prevMonth);
                            }}>
                                Previous
                            </button>
                            <button className="calendar-nav-button" onClick={() => {
                                const nextMonth = new Date(currentMonth);
                                nextMonth.setMonth(nextMonth.getMonth() + 1);
                                setCurrentMonth(nextMonth);
                            }}>
                                Next
                            </button>
                        </div>
                    </div>

                    <div className="calendar-grid grid-cols-7">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="calendar-day-header">
                                {day}
                            </div>
                        ))}
                        
                        {calendarDays.map((day, index) => {
                            if (day === null) {
                                return <div key={`empty-${index}`} className="calendar-day"></div>;
                            }

                            const daySchedules = schedules.filter(schedule => {
                                const scheduleDate = new Date(schedule.aiRecommendedDate);
                                return scheduleDate.getDate() === day &&
                                       scheduleDate.getMonth() === currentMonth.getMonth() &&
                                       scheduleDate.getFullYear() === currentMonth.getFullYear();
                            });

                            const isToday = isCurrentMonth && day === today;
                            const hasOverdue = daySchedules.some(s => isOverdue(s.dueDate));

                            return (
                                <div key={day} className={`calendar-day ${isToday ? 'today' : ''} ${daySchedules.length > 0 ? 'has-payments' : ''} ${hasOverdue ? 'overdue' : ''}`}>
                                    <div className="calendar-day-number">{day}</div>
                                    {daySchedules.length > 0 && (
                                        <div className="calendar-payments">
                                            {daySchedules.slice(0, 2).map((schedule, idx) => (
                                                <div key={idx} className={`calendar-payment ${isOverdue(schedule.dueDate) ? 'overdue' : 'scheduled'}`}>
                                                    {schedule.vendor.substring(0, 8)}
                                                </div>
                                            ))}
                                            {daySchedules.length > 2 && (
                                                <div className="calendar-payment scheduled">
                                                    +{daySchedules.length - 2} more
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Schedule List */}
                <div className="schedule-list">
                    <div className="list-header">
                        <h3 className="list-title">AI-Recommended Schedules</h3>
                        <div className="list-filters">
                            <button
                                className={`filter-button ${selectedFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedFilter('all')}
                            >
                                All ({schedules.length})
                            </button>
                            <button
                                className={`filter-button ${selectedFilter === 'savings' ? 'active' : ''}`}
                                onClick={() => setSelectedFilter('savings')}
                            >
                                With Savings ({schedules.filter(s => s.savingsAmount && s.savingsAmount > 0).length})
                            </button>
                            <button
                                className={`filter-button ${selectedFilter === 'urgent' ? 'active' : ''}`}
                                onClick={() => setSelectedFilter('urgent')}
                            >
                                Urgent ({schedules.filter(s => getDaysUntilDue(s.dueDate) <= 3).length})
                            </button>
                            <button
                                className={`filter-button ${selectedFilter === 'overdue' ? 'active' : ''}`}
                                onClick={() => setSelectedFilter('overdue')}
                            >
                                Overdue ({schedules.filter(s => isOverdue(s.dueDate)).length})
                            </button>
                        </div>
                    </div>

                    <div className="schedule-items">
                        {filteredSchedules.map((schedule) => (
                            <div key={schedule.invoiceId} className={`schedule-item ${isOverdue(schedule.dueDate) ? 'overdue' : ''}`}>
                                <div className="schedule-item-content">
                                    <div className="schedule-item-title">{schedule.vendor}</div>
                                    <div className="schedule-item-details">
                                        Due: {formatDate(schedule.dueDate)} → AI Recommended: {formatDate(schedule.aiRecommendedDate)}
                                    </div>
                                    <div className="schedule-item-details">
                                        {schedule.reason}
                                    </div>
                                </div>
                                <div className="schedule-item-amount">
                                    {formatCurrency(schedule.amount)}
                                    {schedule.savingsAmount && (
                                        <div className="text text-xs color-green-600 mt-1">
                                            Save {formatCurrency(schedule.savingsAmount)}
                                        </div>
                                    )}
                                </div>
                                <div className="schedule-item-actions">
                                    <Badge className={`badge badge-${getConfidenceColor(schedule.confidence)}`}>
                                        {schedule.confidence}% confidence
                                    </Badge>
                                    <button
                                        className="button button-blue button-sm"
                                        onClick={() => handleApplySchedule(schedule.invoiceId)}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredSchedules.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-state-icon">📅</div>
                            <div className="empty-state-text">No schedules found</div>
                            <div className="empty-state-subtext">
                                Try adjusting your filters or check back later for new AI recommendations
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Optimization Insights */}
                <div className="ai-optimization">
                    <div className="ai-title">
                        <Icon as={FiZap} className="icon" />
                        AI Optimization Insights
                    </div>
                    <div className="ai-suggestions">
                        <div className="ai-suggestion">
                            <Icon as={FiTrendingUp} className="ai-suggestion-icon" />
                            <div className="ai-suggestion-content">
                                <div className="ai-suggestion-title">Early Payment Opportunities</div>
                                <div className="ai-suggestion-description">
                                    {schedules.filter(s => s.savingsAmount && s.savingsAmount > 0).length} vendors offer early payment discounts. 
                                    Applying these could save you {formatCurrency(totalSavings)}.
                                </div>
                                <div className="ai-suggestion-action">
                                    <button className="ai-action-button">
                                        Apply Discount Schedules
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="ai-suggestion">
                            <Icon as={FiClock} className="ai-suggestion-icon" />
                            <div className="ai-suggestion-content">
                                <div className="ai-suggestion-title">Cash Flow Optimization</div>
                                <div className="ai-suggestion-description">
                                    AI has identified optimal payment timing to maintain healthy cash flow while maximizing vendor relationships.
                                </div>
                                <div className="ai-suggestion-action">
                                    <button className="ai-action-button">
                                        View Cash Flow Analysis
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="ai-suggestion">
                            <Icon as={FiCalendar} className="ai-suggestion-icon" />
                            <div className="ai-suggestion-content">
                                <div className="ai-suggestion-title">Automated Scheduling</div>
                                <div className="ai-suggestion-description">
                                    Enable auto-scheduling to automatically apply AI recommendations for future invoices.
                                </div>
                                <div className="ai-suggestion-action">
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={autoScheduleEnabled}
                                            onChange={(e) => setAutoScheduleEnabled(e.target.checked)}
                                        />
                                        <span className="switch-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
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

export default SmartScheduler;
