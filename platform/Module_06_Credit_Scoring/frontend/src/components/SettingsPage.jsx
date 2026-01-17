import { useState } from 'react';
import { Settings as SettingsIcon, Shield, Bell } from 'lucide-react';
import './SettingsPage.css';

function SettingsPage() {
    const [tier, setTier] = useState('STANDARD');
    const [optIn, setOptIn] = useState(true);

    return (
        <div className="settings-page">
            <div className="page-header">
                <SettingsIcon size={48} className="header-icon" />
                <div>
                    <h1>Settings & Configuration</h1>
                    <p>Manage contribution tier and privacy preferences</p>
                </div>
            </div>

            <div className="settings-grid">
                {/* Contribution Tier */}
                <div className="setting-card">
                    <h3><Shield size={20} /> Contribution Tier</h3>
                    <div className="tier-options">
                        {['PRIVATE', 'RECEIVE_ONLY', 'STANDARD', 'PREMIUM'].map((t) => (
                            <button
                                key={t}
                                className={`tier-btn ${tier === t ? 'active' : ''}`}
                                onClick={() => setTier(t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="tier-benefits">
                        {tier === 'STANDARD' && '✅ Community scores + Advanced analytics + Early warnings'}
                        {tier === 'PREMIUM' && '✅ Everything + Priority support + Custom reports + API'}
                    </div>
                </div>

                {/* Privacy Settings */}
                <div className="setting-card">
                    <h3><Shield size={20} /> Privacy Settings</h3>
                    <label className="toggle-setting">
                        <input
                            type="checkbox"
                            checked={optIn}
                            onChange={(e) => setOptIn(e.target.checked)}
                        />
                        <span>Contribute payment data to network</span>
                    </label>
                    <pclassName="privacy-note">
                    All data is anonymized with SHA-256 hashing
                </p>
            </div>
        </div>
        </div >
    );
}

export default SettingsPage;
