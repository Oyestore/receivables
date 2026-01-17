import React from 'react';
import ReactDOM from 'react-dom/client';
import CommandCenter from './components/CommandCenter';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <CommandCenter tenantId="tenant-123" />
    </React.StrictMode>
);
