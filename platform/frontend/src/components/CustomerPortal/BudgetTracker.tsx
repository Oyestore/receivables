import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiPieChart, FiAlertCircle, FiTrendingUp } from 'react-icons/fi';
import './BudgetTracker.css';

interface BudgetCategory {
    id: string;
    name: string;
    limit: number;
    spent: number;
    color: string;
}

interface BudgetTrackerProps {
    customerId: string;
}

const BudgetTracker: React.FC<BudgetTrackerProps> = ({ customerId }) => {
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [overBudget, setOverBudget] = useState(false);

    useEffect(() => {
        fetchBudgetData();
    }, [customerId]);

    const fetchBudgetData = () => {
        // Mock budget categories
        const mockCategories: BudgetCategory[] = [
            {
                id: 'cons',
                name: 'Consulting Services',
                limit: 100000,
                spent: 95000,
                color: 'orange',
            },
            {
                id: 'tech',
                name: 'Technology & Software',
                limit: 50000,
                spent: 32000,
                color: 'blue',
            },
            {
                id: 'marketing',
                name: 'Marketing',
                limit: 30000,
                spent: 28500,
                color: 'purple',
            },
        ];

        setCategories(mockCategories);
        setOverBudget(mockCategories.some(c => c.spent >= c.limit));
    };

    const getPercentage = (spent: number, limit: number) => {
        return (spent / limit) * 100;
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 90) return 'red';
        if (percentage >= 75) return 'orange';
        return 'green';
    };

    const totalBudget = categories.reduce((sum, cat) => sum + cat.limit, 0);
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    const overallPercentage = getPercentage(totalSpent, totalBudget);

    return (
        <VStack gap={6} align="stretch">
            {/* Header */}
            <h2 className="heading heading-lg color-gray-800">
                <Icon as={FiPieChart} className="icon mr-2" />
                Budget Tracker
            </h2>

            {/* Budget Overview */}
            <div className="budget-overview">
                <div className="budget-summary-card bg-gradient-to-br bg-blue-50 border-top-4 border-blue-500">
                    <div className="summary-title">Total Budget</div>
                    <div className="summary-amount">₹{(totalBudget / 1000).toFixed(0)}K</div>
                    <div className="summary-change positive">
                        <Icon as={FiTrendingUp} className="icon mr-1" />
                        +12% from last month
                    </div>
                </div>

                <div className="budget-summary-card bg-gradient-to-br bg-green-50 border-top-4 border-green-500">
                    <div className="summary-title">Total Spent</div>
                    <div className="summary-amount">₹{(totalSpent / 1000).toFixed(0)}K</div>
                    <div className="summary-change positive">
                        <Icon as={FiTrendingUp} className="icon mr-1" />
                        On track
                    </div>
                </div>

                <div className="budget-summary-card bg-gradient-to-br bg-orange-50 border-top-4 border-orange-500">
                    <div className="summary-title">Remaining</div>
                    <div className="summary-amount">₹{(totalRemaining / 1000).toFixed(0)}K</div>
                    <div className="summary-change negative">
                        <Icon as={FiAlertCircle} className="icon mr-1" />
                        {overallPercentage.toFixed(0)}% used
                    </div>
                </div>

                <div className="budget-summary-card bg-gradient-to-br bg-purple-50 border-top-4 border-purple-500">
                    <div className="summary-title">Categories</div>
                    <div className="summary-amount">{categories.length}</div>
                    <div className="summary-change positive">
                        <Icon as={FiPieChart} className="icon mr-1" />
                        Active budgets
                    </div>
                </div>
            </div>

            {/* Budget Alert */}
            {overBudget && (
                <div className="alert alert-warning">
                    <div className="h-stack align-start">
                        <Icon as={FiAlertCircle} className="alert-icon" />
                        <div>
                            <div className="font-semibold color-gray-800">Budget Alert</div>
                            <div className="text text-sm color-gray-700">
                                One or more categories have exceeded their budget limits. Review your spending and adjust as needed.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Budget Categories */}
            <div className="budget-categories">
                {categories.map((category) => {
                    const percentage = getPercentage(category.spent, category.limit);
                    const remaining = category.limit - category.spent;
                    const progressColor = getProgressColor(percentage);

                    return (
                        <div key={category.id} className="budget-category">
                            <div className="category-header">
                                <h4 className="category-name">{category.name}</h4>
                                <span className="category-amount">₹{(category.spent / 1000).toFixed(1)}K</span>
                            </div>

                            <div className="category-progress">
                                <div className="progress">
                                    <div
                                        className={`progress-bar progress-bar-${progressColor}`}
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="category-details">
                                <span className="category-spent">₹{(category.spent / 1000).toFixed(1)}K spent</span>
                                <span className={`category-remaining ${remaining < 0 ? 'danger' : remaining < category.limit * 0.2 ? 'warning' : ''}`}>
                                    ₹{(remaining / 1000).toFixed(1)}K left
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Budget Chart */}
            <div className="budget-chart">
                <h3 className="heading heading-md mb-4">Budget Distribution</h3>
                <div className="chart-container">
                    {/* Simple CSS-based chart representation */}
                    <div className="v-stack gap-3 align-center">
                        {categories.map((category) => {
                            const percentage = getPercentage(category.spent, category.limit);
                            return (
                                <div key={category.id} className="w-full">
                                    <div className="h-stack justify-between mb-1">
                                        <span className="text text-sm font-medium">{category.name}</span>
                                        <span className="text text-sm color-gray-600">
                                            {percentage.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="progress" style={{ height: '12px' }}>
                                        <div
                                            className={`progress-bar progress-bar-${category.color}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Budget Insights */}
            <div className="card bg-cfo-secondary-50 border-radius-lg">
                <div className="card-body">
                    <VStack gap={3} align="start">
                        <h3 className="heading heading-sm color-gray-800">
                            🤖 AI Budget Insights
                        </h3>
                        <div className="v-stack gap-2">
                            <div className="h-stack gap-3">
                                <Icon as={FiTrendingUp} className="icon" style={{ color: '#805ad5' }} />
                                <span className="text text-sm color-gray-700">
                                    Your Marketing category is at 95% of budget. Consider reallocating funds 
                                    or reducing expenses in this area.
                                </span>
                            </div>
                            <div className="h-stack gap-3">
                                <Icon as={FiPieChart} className="icon" style={{ color: '#805ad5' }} />
                                <span className="text text-sm color-gray-700">
                                    Technology spending is well within budget (64%). You have room for 
                                    strategic investments in this area.
                                </span>
                            </div>
                            <div className="h-stack gap-3">
                                <Icon as={FiAlertCircle} className="icon" style={{ color: '#805ad5' }} />
                                <span className="text text-sm color-gray-700">
                                    Overall budget utilization is at {overallPercentage.toFixed(0)}%. 
                                    You're on track to meet your financial goals this quarter.
                                </span>
                            </div>
                        </div>
                    </VStack>
                </div>
            </div>

            {/* Budget Actions */}
            <div className="h-stack gap-4 justify-center">
                <button className="button button-blue button-sm">
                    <Icon as={FiPieChart} className="icon mr-1" />
                    View Detailed Report
                </button>
                <button className="button button-outline button-sm">
                    <Icon as={FiTrendingUp} className="icon mr-1" />
                    Export Budget Data
                </button>
            </div>
        </VStack>
    );
};

export default BudgetTracker;
