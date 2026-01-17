import React, { useState } from 'react';
import {
    Box,
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiBell, FiMail, FiPhone, FiMessageSquare, FiZap } from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import './CollectionAutomation.css';

interface ReminderRule {
    id: string;
    name: string;
    trigger: 'days_before_due' | 'days_after_due' | 'amount_threshold';
    triggerValue: number;
    channel: 'email' | 'sms' | 'whatsapp' | 'phone';
    template: string;
    isActive: boolean;
    successRate: number;
}

interface CollectionAutomationProps {
    tenantId: string;
}

const CollectionAutomation: React.FC<CollectionAutomationProps> = ({ tenantId }) => {
    const [rules, setRules] = useState<ReminderRule[]>([
        {
            id: 'r1',
            name: 'Gentle Reminder - 3 Days Before Due',
            trigger: 'days_before_due',
            triggerValue: 3,
            channel: 'email',
            template: 'friendly_reminder',
            isActive: true,
            successRate: 65,
        },
        {
            id: 'r2',
            name: 'Overdue Alert - 7 Days After Due',
            trigger: 'days_after_due',
            triggerValue: 7,
            channel: 'whatsapp',
            template: 'overdue_urgent',
            isActive: true,
            successRate: 78,
        },
    ]);

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const handleToggleRule = (id: string) => {
        setRules(prev => prev.map(rule =>
            rule.id === id ? { ...rule, isActive: !rule.isActive } : rule
        ));

        setToastMessage('Rule updated successfully');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'email':
                return FiMail;
            case 'sms':
                return FiMessageSquare;
            case 'whatsapp':
                return SiWhatsapp;
            case 'phone':
                return FiPhone;
            default:
                return FiBell;
        }
    };

    const getChannelColor = (channel: string) => {
        switch (channel) {
            case 'email':
                return 'blue';
            case 'sms':
                return 'green';
            case 'whatsapp':
                return 'green';
            case 'phone':
                return 'purple';
            default:
                return 'gray';
        }
    };

    const getTriggerDescription = (rule: ReminderRule) => {
        switch (rule.trigger) {
            case 'days_before_due':
                return `${rule.triggerValue} days before due date`;
            case 'days_after_due':
                return `${rule.triggerValue} days after due date`;
            case 'amount_threshold':
                return `Amount exceeds ₹${rule.triggerValue.toLocaleString('en-IN')}`;
            default:
                return '';
        }
    };

    return (
        <Box>
            <VStack gap={6} align="stretch">
                {/* Header */}
                <HStack justify="space-between">
                    <h2 className="heading heading-lg color-gray-800">
                        <Icon as={FiZap} className="icon mr-2" />
                        Collection Automation
                    </h2>
                    <button className="button button-blue button-sm">
                        <Icon as={FiBell} className="icon mr-1" />
                        Create New Rule
                    </button>
                </HStack>

                {/* Automation Rules */}
                <div className="v-stack gap-4">
                    {rules.map((rule) => (
                        <div key={rule.id} className="automation-rule">
                            <div className="rule-info">
                                <div className="rule-name">{rule.name}</div>
                                <div className="rule-description">{getTriggerDescription(rule)}</div>
                                <div className="rule-triggers">
                                    <Badge className={`badge badge-${getChannelColor(rule.channel)}`}>
                                        <Icon as={getChannelIcon(rule.channel)} className="icon mr-1" />
                                        {rule.channel}
                                    </Badge>
                                    <Badge className={`badge ${rule.successRate >= 70 ? 'badge-green' : 'badge-orange'}`}>
                                        {rule.successRate}% success rate
                                    </Badge>
                                </div>
                            </div>
                            <div className="rule-actions">
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={rule.isActive}
                                        onChange={() => handleToggleRule(rule.id)}
                                    />
                                    <span className="switch-slider"></span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Settings Panel */}
                <div className="card bg-cfo-secondary-50 border-radius-lg">
                    <div className="card-body">
                        <div className="settings-panel">
                            <div className="settings-section">
                                <h3 className="settings-title">Automation Settings</h3>
                                <p className="settings-description">
                                    Configure global settings for your collection automation system
                                </p>
                                <div className="v-stack gap-0">
                                    <div className="setting-item">
                                        <div>
                                            <div className="setting-label">Enable AI-powered timing</div>
                                            <div className="setting-description">
                                                Use machine learning to optimize reminder timing
                                            </div>
                                        </div>
                                        <label className="switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="switch-slider"></span>
                                        </label>
                                    </div>
                                    <div className="setting-item">
                                        <div>
                                            <div className="setting-label">Maximum daily reminders</div>
                                            <div className="setting-description">
                                                Limit the number of reminders sent per customer per day
                                            </div>
                                        </div>
                                        <select className="select" style={{ width: '120px' }}>
                                            <option value="1">1</option>
                                            <option value="2">2</option>
                                            <option value="3">3</option>
                                            <option value="5">5</option>
                                        </select>
                                    </div>
                                    <div className="setting-item">
                                        <div>
                                            <div className="setting-label">Quiet hours</div>
                                            <div className="setting-description">
                                                Don't send reminders during specified hours
                                            </div>
                                        </div>
                                        <div className="h-stack gap-2">
                                            <input 
                                                type="time" 
                                                className="input" 
                                                style={{ width: '100px' }}
                                                defaultValue="20:00"
                                            />
                                            <span className="text color-gray-600">to</span>
                                            <input 
                                                type="time" 
                                                className="input" 
                                                style={{ width: '100px' }}
                                                defaultValue="08:00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="settings-section">
                                <h3 className="settings-title">Performance Metrics</h3>
                                <div className="v-stack gap-3">
                                    <div className="h-stack justify-between">
                                        <span className="text font-medium">Overall Success Rate</span>
                                        <Badge className="badge badge-green">72%</Badge>
                                    </div>
                                    <div className="h-stack justify-between">
                                        <span className="text font-medium">Average Response Time</span>
                                        <Badge className="badge badge-blue">2.3 hours</Badge>
                                    </div>
                                    <div className="h-stack justify-between">
                                        <span className="text font-medium">Collections Improved</span>
                                        <Badge className="badge badge-purple">+28%</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Insights */}
                <div className="card">
                    <div className="card-body">
                        <VStack gap={3} align="start">
                            <h3 className="heading heading-sm color-gray-800">
                                🤖 AI Automation Insights
                            </h3>
                            <div className="v-stack gap-2">
                                <p className="text text-sm color-gray-700">
                                    Your current automation rules are performing well with a 72% success rate.
                                    Consider adding a WhatsApp reminder 2 days before due date to improve early payments.
                                </p>
                                <p className="text text-sm color-gray-700">
                                    Customers respond best to reminders sent between 10 AM - 2 PM.
                                    Adjust your quiet hours settings to optimize engagement rates.
                                </p>
                                <p className="text text-sm color-gray-700">
                                    AI suggests personalizing reminder templates based on customer payment history
                                    for better response rates.
                                </p>
                            </div>
                        </VStack>
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
        </Box>
    );
};

export default CollectionAutomation;
