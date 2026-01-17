/**
 * Event Node - Custom React Flow Node
 * Represents a payment event in the workflow canvas
 */

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { EventNodeData } from '../EventBuilder';
import './EventNode.css';

const eventTypeIcons: Record<string, string> = {
    DELIVERY: '📦',
    MILESTONE: '🎯',
    PERFORMANCE: '📊',
    COMPLIANCE: '✅',
    TIME: '⏰',
    QUALITY: '⭐',
    CONTINGENT: '🔗',
    HYBRID: '🔀'
};

export const EventNode: React.FC<NodeProps> = ({ data, selected }) => {
    const nodeData = data as EventNodeData;
    const icon = eventTypeIcons[nodeData.eventType] || '📄';

    return (
        <div className={`event-node ${selected ? 'event-node--selected' : ''}`}>
            {/* Input Handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="event-node__handle"
            />

            {/* Node Content */}
            <div className="event-node__header">
                <span className="event-node__icon">{icon}</span>
                <span className="event-node__type">{nodeData.eventType}</span>
            </div>

            <div className="event-node__body">
                <div className="event-node__label">{nodeData.label}</div>
                {nodeData.description && (
                    <div className="event-node__description">{nodeData.description}</div>
                )}
                {nodeData.paymentAmount && (
                    <div className="event-node__payment">₹{nodeData.paymentAmount.toLocaleString()}</div>
                )}
                {nodeData.paymentPercentage && (
                    <div className="event-node__payment">{nodeData.paymentPercentage}%</div>
                )}
            </div>

            {/* Output Handle (bottom) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="event-node__handle"
            />
        </div>
    );
};

export default EventNode;
