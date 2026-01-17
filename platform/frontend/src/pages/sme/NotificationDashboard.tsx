import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Bell,
    Plus,
    Mail,
    MessageSquare,
    Send,
    CheckCircle,
    Clock,
    XCircle,
    TrendingUp,
    Filter,
} from 'lucide-react';
import {
    DashboardHeader,
    StatCard,
    GradientCard,
    StatusBadge,
    Button,
} from '../../design-system';
import './NotificationDashboard.css';

interface Notification {
    id: string;
    type: 'email' | 'sms' | 'whatsapp';
    recipient: string;
    subject: string;
    status: 'sent' | 'delivered' | 'failed' | 'pending';
    sentAt: string;
}

const notificationChannels = {
    email: { icon: Mail, label: 'Email', color: '#3b82f6' },
    sms: { icon: MessageSquare, label: 'SMS', color: '#10b981' },
    whatsapp: { icon: Send, label: 'WhatsApp', color: '#059669' },
};

export const NotificationDashboard: React.FC = () => {
    const [notifications] = useState<Notification[]>([
        {
            id: '1',
            type: 'email',
            recipient: 'customer@example.com',
            subject: 'Payment Reminder - Invoice INV-001',
            status: 'delivered',
            sentAt: '2025-01-14T10:30:00',
        },
        {
            id: '2',
            type: 'whatsapp',
            recipient: '+91 98765 43210',
            subject: 'Invoice INV-002 Generated',
            status: 'sent',
            sentAt: '2025-01-14T11:15:00',
        },
        {
            id: '3',
            type: 'sms',
            recipient: '+91 98765 43211',
            subject: 'Payment Received Confirmation',
            status: 'delivered',
            sentAt: '2025-01-14T12:00:00',
        },
        {
            id: '4',
            type: 'email',
            recipient: 'client@company.com',
            subject: 'Monthly Statement',
            status: 'pending',
            sentAt: '2025-01-14T13:45:00',
        },
    ]);

    const stats = {
        total: notifications.length,
        sent: notifications.filter(n => n.status === 'sent' || n.status === 'delivered').length,
        pending: notifications.filter(n => n.status === 'pending').length,
        failed: notifications.filter(n => n.status === 'failed').length,
        deliveryRate: ((notifications.filter(n => n.status === 'delivered').length / notifications.length) * 100).toFixed(1),
    };

    const channelStats = Object.keys(notificationChannels).map(channel => ({
        channel,
        count: notifications.filter(n => n.type === channel).length,
    }));

    return (
        <div className="notification-dashboard">
            <DashboardHeader
                title="Notification Service"
                subtitle="Manage and monitor all notifications"
                icon={Bell}
                actions={
                    <>
                        <Button variant="outline" icon={Filter} size="md">
                            Filter
                        </Button>
                        <Button variant="primary" icon={Plus} theme="operations" size="md">
                            Send Notification
                        </Button>
                    </>
                }
            />

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    value={stats.total}
                    label="Total Sent"
                    icon={Bell}
                    theme="operations"
                    trend={{ value: 15.3, direction: 'up' }}
                />
                <StatCard
                    value={stats.sent}
                    label="Delivered"
                    icon={CheckCircle}
                    theme="operations"
                />
                <StatCard
                    value={stats.pending}
                    label="Pending"
                    icon={Clock}
                    theme="operations"
                />
                <StatCard
                    value={`${stats.deliveryRate}%`}
                    label="Delivery Rate"
                    icon={TrendingUp}
                    theme="operations"
                />
            </div>

            {/* Channels Overview */}
            <div className="channels-row">
                {Object.entries(notificationChannels).map(([key, channel]) => {
                    const channelData = channelStats.find(c => c.channel === key);
                    const ChannelIcon = channel.icon;

                    return (
                        <motion.div
                            key={key}
                            className="channel-card"
                            style={{ borderColor: channel.color }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                        >
                            <div className="channel-icon-wrapper" style={{ background: channel.color }}>
                                <ChannelIcon className="channel-icon" />
                            </div>
                            <div className="channel-info">
                                <h3 className="channel-name">{channel.label}</h3>
                                <div className="channel-count">{channelData?.count || 0} sent</div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Notifications List */}
            <GradientCard theme="operations" glass className="notifications-container">
                <h3 className="section-title">Recent Notifications</h3>

                <div className="notifications-list">
                    {notifications.map((notification, index) => {
                        const Channel = notificationChannels[notification.type];
                        const ChannelIcon = Channel.icon;

                        return (
                            <motion.div
                                key={notification.id}
                                className="notification-item"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div
                                    className="notification-channel-badge"
                                    style={{ background: Channel.color }}
                                >
                                    <ChannelIcon className="badge-icon" />
                                </div>

                                <div className="notification-content">
                                    <h4 className="notification-subject">{notification.subject}</h4>
                                    <div className="notification-meta">
                                        <span className="meta-recipient">{notification.recipient}</span>
                                        <span className="meta-divider">•</span>
                                        <span className="meta-time">
                                            {new Date(notification.sentAt).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </div>

                                <div className="notification-status">
                                    <StatusBadge
                                        status={
                                            notification.status === 'delivered' ? 'success' :
                                                notification.status === 'sent' ? 'info' :
                                                    notification.status === 'pending' ? 'pending' : 'error'
                                        }
                                        label={notification.status}
                                        size="sm"
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </GradientCard>
        </div>
    );
};
