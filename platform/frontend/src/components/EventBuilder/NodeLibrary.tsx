/**
 * Node Library - Event Type Palette
 * Drag-and-drop library of available event types
 */

import React from 'react';
import { EventType } from '../../types/events';
import './NodeLibrary.css';

interface NodeLibraryProps {
    onAddNode: (eventType: EventType) => void;
}

const eventTypeConfig = [
    {
        type: EventType.DELIVERY,
        icon: '📦',
        label: 'Delivery',
        description: 'Physical/digital delivery events',
        color: '#3b82f6'
    },
    {
        type: EventType.MILESTONE,
        icon: '🎯',
        label: 'Milestone',
        description: 'Project phase completion',
        color: '#10b981'
    },
    {
        type: EventType.PERFORMANCE,
        icon: '📊',
        label: 'Performance',
        description: 'KPI/SLA achievement',
        color: '#8b5cf6'
    },
    {
        type: EventType.COMPLIANCE,
        icon: '✅',
        label: 'Compliance',
        description: 'Regulatory/certification',
        color: '#f59e0b'
    },
    {
        type: EventType.TIME,
        icon: '⏰',
        label: 'Time-Based',
        description: 'Scheduled/installment payments',
        color: '#06b6d4'
    },
    {
        type: EventType.QUALITY,
        icon: '⭐',
        label: 'Quality',
        description: 'Quality acceptance tests',
        color: '#ec4899'
    },
    {
        type: EventType.CONTINGENT,
        icon: '🔗',
        label: 'Contingent',
        description: 'Pay-if-paid, earnouts',
        color: '#f97316'
    },
    {
        type: EventType.HYBRID,
        icon: '🔀',
        label: 'Hybrid',
        description: 'Complex multi-condition',
        color: '#6366f1'
    }
];

export const NodeLibrary: React.FC<NodeLibraryProps> = ({ onAddNode }) => {
    return (
        <div className="node-library">
            <h3 className="node-library__title">Event Types</h3>
            <p className="node-library__subtitle">Click to add to canvas</p>

            <div className="node-library__items">
                {eventTypeConfig.map((config) => (
                    <button
                        key={config.type}
                        className="node-library__item"
                        onClick={() => onAddNode(config.type)}
                        style={{ borderLeftColor: config.color }}
                        title={config.description}
                    >
                        <span className="node-library__item-icon">{config.icon}</span>
                        <div className="node-library__item-content">
                            <div className="node-library__item-label">{config.label}</div>
                            <div className="node-library__item-desc">{config.description}</div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="node-library__info">
                <h4>Quick Tips:</h4>
                <ul>
                    <li>Click an event type to add it to the canvas</li>
                    <li>Drag connections between events to define dependencies</li>
                    <li>Select a node to edit its properties</li>
                    <li>Save workflow when complete</li>
                </ul>
            </div>
        </div>
    );
};

export default NodeLibrary;
