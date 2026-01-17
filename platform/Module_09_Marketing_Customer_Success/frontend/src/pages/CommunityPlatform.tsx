import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Award, Book } from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

/**
 * Community Platform
 * 
 * Forums and template marketplace (simplified combined version)
 */

const CommunityPlatform: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'forum' | 'templates'>('forum');

    const discussions = [
        { id: '1', title: 'How to automate invoice reminders?', author: 'John Doe', replies: 12, likes: 24, category: 'Automation' },
        { id: '2', title: 'Best practices for credit scoring', author: 'Jane Smith', replies: 8, likes: 18, category: 'Finance' },
        { id: '3', title: 'Integration with payment gateways', author: 'Mike Brown', replies: 15, likes: 31, category: 'Integrations' },
    ];

    const templates = [
        { id: '1', name: 'Standard Invoice Template', downloads: 1245, rating: 4.8, category: 'Invoicing' },
        { id: '2', name: 'Dispute Resolution Workflow', downloads: 892, rating: 4.6, category: 'Disputes' },
        { id: '3', name: 'Collection Playbook', downloads: 1567, rating: 4.9, category: 'Collections' },
    ];

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-gradient">Community Platform</h1>
                <p className="text-muted-foreground mt-1">Connect, learn, and share with peers</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Active Members" value={2847} icon={<Award size={24} />} gradient="primary" />
                <MetricCard title="Discussions" value={156} icon={<MessageSquare size={24} />} gradient="success" />
                <MetricCard title="Templates" value={89} icon={<Book size={24} />} gradient="warning" />
            </div>

            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('forum')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'forum'
                            ? 'bg-gradient-primary text-white shadow-glow'
                            : 'bg-card border border-border'
                        }`}
                >
                    Forum
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'templates'
                            ? 'bg-gradient-primary text-white shadow-glow'
                            : 'bg-card border border-border'
                        }`}
                >
                    Template Marketplace
                </button>
            </div>

            {activeTab === 'forum' ? (
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Trending Discussions</h3>
                    <div className="space-y-3">
                        {discussions.map((discussion) => (
                            <div key={discussion.id} className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-semibold mb-1">{discussion.title}</h4>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <span>by {discussion.author}</span>
                                            <Badge variant="default" size="sm">{discussion.category}</Badge>
                                            <span>{discussion.replies} replies</span>
                                            <span>❤️ {discussion.likes}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            ) : (
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Popular Templates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {templates.map((template) => (
                            <div key={template.id} className="p-4 bg-muted/30 rounded-lg hover:shadow-lg transition-shadow">
                                <div className="h-32 bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/30 dark:to-purple-900/30 rounded-lg mb-3 flex items-center justify-center">
                                    <Book size={48} className="text-primary" />
                                </div>
                                <h4 className="font-semibold mb-2">{template.name}</h4>
                                <div className="flex items-center justify-between text-sm">
                                    <Badge variant="default" size="sm">{template.category}</Badge>
                                    <span className="text-muted-foreground">{template.downloads} downloads</span>
                                </div>
                                <div className="flex items-center gap-1 mt-2">
                                    <span className="text-amber-500">★</span>
                                    <span className="text-sm font-medium">{template.rating}</span>
                                </div>
                                <button className="w-full mt-3 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                                    Download
                                </button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default CommunityPlatform;
