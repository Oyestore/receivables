import React, { useState } from 'react';
import CommandCenter from './components/CommandCenter';
import ConversationalCopilot from './components/ConversationalCopilot';
import MorningBriefing from './components/MorningBriefing';
import './App.css';

/**
 * Main Module 04 Application
 * 
 * Business Intelligence Copilot Dashboard
 * Integrates all Phase 1-3 components
 */
const App = () => {
    const [view, setView] = useState('dashboard'); // dashboard, briefing
    const [copilotMinimized, setCopilotMinimized] = useState(true);
    const tenantId = 'tenant-123';

    // Auto-show morning briefing at 9 AM
    React.useEffect(() => {
        const hour = new Date().getHours();
        // Show briefing if it's morning (6 AM - 11 AM) on first load
        if (hour >= 6 && hour < 12) {
            const hasSeenBriefing = sessionStorage.getItem('briefing_seen_today');
            if (!hasSeenBriefing) {
                setView('briefing');
            }
        }
    }, []);

    const handleBriefingClose = () => {
        sessionStorage.setItem('briefing_seen_today', 'true');
        setView('dashboard');
    };

    return (
        <div className="app">
            {/* Main View */}
            {view === 'briefing' && (
                <div className="briefing-overlay">
                    <MorningBriefing
                        tenantId={tenantId}
                        onClose={handleBriefingClose}
                    />
                </div>
            )}

            {view === 'dashboard' && (
                <>
                    <CommandCenter tenantId={tenantId} />

                    {/* Show Briefing Button */}
                    <button
                        className="show-briefing-btn"
                        onClick={() => setView('briefing')}
                    >
                        📋 Morning Briefing
                    </button>
                </>
            )}

            {/* Floating Copilot */}
            <ConversationalCopilot
                tenantId={tenantId}
                minimized={copilotMinimized}
                onToggle={() => setCopilotMinimized(!copilotMinimized)}
            />
        </div>
    );
};

export default App;
