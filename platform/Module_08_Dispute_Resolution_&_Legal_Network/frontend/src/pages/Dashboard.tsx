import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Gavel,
    TrendingUp,
    Clock,
    DollarSign,
    Briefcase,
    Shield,
    Users,
    Search,
    Filter,
    MoreHorizontal,
    Plus,
    FileText,
    ArrowUpRight
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';

/**
 * Dispute Resolution Dashboard
 * Premium UI for Managing Disputes & Legal Actions
 */

export default function Dashboard() {
    const navigate = useNavigate();

    // Mock Data (Replacing useQuery for visual demo to ensure instant render)
    const stats = [
        { title: 'Total Disputes', value: 142, change: '+12%', icon: Gavel, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { title: 'Active Collections', value: 38, change: '-5%', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
        { title: 'Recovery Rate', value: '68%', change: '+8%', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { title: 'Avg Resolution', value: '42 Days', change: '-15%', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ];

    const resolutionData = [
        { month: 'Jan', resolved: 12, new: 18 },
        { month: 'Feb', resolved: 15, new: 20 },
        { month: 'Mar', resolved: 18, new: 16 },
        { month: 'Apr', resolved: 22, new: 24 },
        { month: 'May', resolved: 28, new: 20 },
    ];

    const recentDisputes = [
        { id: 'DSP-2024-001', client: 'TechFlow Systems', amount: '₹1,25,000', status: 'In Mediation', date: '2024-05-18' },
        { id: 'DSP-2024-002', client: 'Global Logistics', amount: '₹48,000', status: 'Arbitration', date: '2024-05-20' },
        { id: 'DSP-2024-003', client: 'StartUp Hub', amount: '₹12,500', status: 'Resolved', date: '2024-05-22' },
        { id: 'DSP-2024-004', client: 'Retail Kings', amount: '₹2,50,000', status: 'New', date: '2024-05-24' },
    ];

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Resolved': return 'bg-green-100 text-green-700 border-green-200';
            case 'In Mediation': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Arbitration': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'New': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="min-h-screen bg-background bg-grid-pattern p-6 space-y-8 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[100px] -z-10 animate-pulse-slow" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] -z-10 animate-pulse-slow" />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between backdrop-blur-sm p-4 rounded-xl border border-white/10"
            >
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-purple-600 tracking-tight">
                        Dispute Resolution Center
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">
                        Manage disputes, collections, and legal actions
                    </p>
                </div>
                <button
                    onClick={() => navigate('/disputes/create')}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all active:scale-95 flex items-center gap-2"
                >
                    <Plus size={20} />
                    New Dispute
                </button>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
                    >
                        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${stat.color}`}>
                            <stat.icon size={60} />
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                            <span className={`text-sm font-semibold px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-foreground">{stat.value}</h3>
                        <p className="text-muted-foreground font-medium">{stat.title}</p>
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-card lg:col-span-2 p-6 rounded-2xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <TrendingUp className="text-primary" />
                        Dispute Volume vs Resolution
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={resolutionData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="new" name="New Disputes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="resolved" name="Resolved" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/collections')}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                            >
                                <div className="p-2 rounded-lg bg-green-100 text-green-700 group-hover:scale-110 transition-transform"><DollarSign size={20} /></div>
                                <div>
                                    <p className="font-semibold text-sm">View Collections</p>
                                    <p className="text-xs text-muted-foreground">Manage ongoing recovery</p>
                                </div>
                                <ArrowUpRight className="ml-auto text-muted-foreground group-hover:text-primary transition-colors" size={16} />
                            </button>

                            <button
                                onClick={() => navigate('/legal/directory')}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                            >
                                <div className="p-2 rounded-lg bg-blue-100 text-blue-700 group-hover:scale-110 transition-transform"><Briefcase size={20} /></div>
                                <div>
                                    <p className="font-semibold text-sm">Legal Directory</p>
                                    <p className="text-xs text-muted-foreground">Find legal experts</p>
                                </div>
                                <ArrowUpRight className="ml-auto text-muted-foreground group-hover:text-primary transition-colors" size={16} />
                            </button>

                            <button
                                onClick={() => navigate('/approvals')}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                            >
                                <div className="p-2 rounded-lg bg-purple-100 text-purple-700 group-hover:scale-110 transition-transform"><Shield size={20} /></div>
                                <div>
                                    <p className="font-semibold text-sm">Approval Queue</p>
                                    <p className="text-xs text-muted-foreground">3 pending requests</p>
                                </div>
                                <ArrowUpRight className="ml-auto text-muted-foreground group-hover:text-primary transition-colors" size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Disputes List */}
            <div className="glass-card rounded-2xl overflow-hidden border-0">
                <div className="p-6 border-b border-border/50 flex justify-between items-center bg-white/50 dark:bg-gray-900/50">
                    <div>
                        <h3 className="text-xl font-bold">Recent Disputes</h3>
                        <p className="text-sm text-muted-foreground">Track latest dispute case status</p>
                    </div>
                    <button className="text-primary text-sm font-semibold hover:underline">View All</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/30 text-muted-foreground uppercase tracking-wider text-xs font-semibold">
                            <tr>
                                <th className="p-4 pl-6">Case ID</th>
                                <th className="p-4">Client</th>
                                <th className="p-4">Disputed Amount</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Date Filed</th>
                                <th className="p-4 text-right pr-6">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {recentDisputes.map((dispute) => (
                                <tr key={dispute.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="p-4 pl-6 font-mono text-muted-foreground">{dispute.id}</td>
                                    <td className="p-4 font-semibold text-foreground">{dispute.client}</td>
                                    <td className="p-4 font-bold">{dispute.amount}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(dispute.status)}`}>
                                            {dispute.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-muted-foreground">{dispute.date}</td>
                                    <td className="p-4 text-right pr-6">
                                        <button className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-primary">
                                            <MoreHorizontal size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
