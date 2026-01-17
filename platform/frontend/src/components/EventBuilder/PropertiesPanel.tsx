/**
 * Properties Panel
 * Edit selected event node properties
 */

import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { EventNodeData } from './EventBuilder';
import './PropertiesPanel.css';

interface PropertiesPanelProps {
    selectedNode: Node | null;
    onUpdateProperties: (data: Partial<EventNodeData>) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    selectedNode,
    onUpdateProperties
}) => {
    const [label, setLabel] = useState('');
    const [description, setDescription] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentPercentage, setPaymentPercentage] = useState('');
    const [paymentType, setPaymentType] = useState<'amount' | 'percentage'>('percentage');

    // Update form when selected node changes
    useEffect(() => {
        if (selectedNode) {
            const nodeData = selectedNode.data as EventNodeData;
            setLabel(nodeData.label || '');
            setDescription(nodeData.description || '');
            setPaymentAmount(nodeData.paymentAmount?.toString() || '');
            setPaymentPercentage(nodeData.paymentPercentage?.toString() || '');

            if (nodeData.paymentAmount) {
                setPaymentType('amount');
            } else {
                setPaymentType('percentage');
            }
        }
    }, [selectedNode]);

    const handleSave = () => {
        const updates: Partial<EventNodeData> = {
            label,
            description
        };

        if (paymentType === 'amount' && paymentAmount) {
            updates.paymentAmount = parseFloat(paymentAmount);
            updates.paymentPercentage = undefined;
        } else if (paymentType === 'percentage' && paymentPercentage) {
            updates.paymentPercentage = parseFloat(paymentPercentage);
            updates.paymentAmount = undefined;
        }

        onUpdateProperties(updates);
    };

    if (!selectedNode) {
        return (
            <div className="properties-panel">
                <div className="properties-panel__empty">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Select a node to edit its properties</p>
                </div>
            </div>
        );
    }

    return (
        <div className="properties-panel">
            <h3 className="properties-panel__title">Event Properties</h3>

            <div className="properties-panel__form">
                <div className="form-group">
                    <label htmlFor="event-label">Event Name</label>
                    <input
                        id="event-label"
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="e.g., Phase 1 Completion"
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="event-type">Event Type</label>
                    <input
                        id="event-type"
                        type="text"
                        value={(selectedNode.data as EventNodeData).eventType}
                        disabled
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="event-description">Description</label>
                    <textarea
                        id="event-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the event criteria..."
                        rows={3}
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label>Payment Type</label>
                    <div className="radio-group">
                        <label className="radio-label">
                            <input
                                type="radio"
                                value="percentage"
                                checked={paymentType === 'percentage'}
                                onChange={(e) => setPaymentType(e.target.value as 'percentage')}
                            />
                            <span>Percentage of Total</span>
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                value="amount"
                                checked={paymentType === 'amount'}
                                onChange={(e) => setPaymentType(e.target.value as 'amount')}
                            />
                            <span>Fixed Amount</span>
                        </label>
                    </div>
                </div>

                {paymentType === 'percentage' ? (
                    <div className="form-group">
                        <label htmlFor="payment-percentage">Payment Percentage (%)</label>
                        <input
                            id="payment-percentage"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={paymentPercentage}
                            onChange={(e) => setPaymentPercentage(e.target.value)}
                            placeholder="e.g., 25"
                            className="form-control"
                        />
                    </div>
                ) : (
                    <div className="form-group">
                        <label htmlFor="payment-amount">Payment Amount (₹)</label>
                        <input
                            id="payment-amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="e.g., 50000"
                            className="form-control"
                        />
                    </div>
                )}

                <button onClick={handleSave} className="btn btn-primary btn-block">
                    Update Event
                </button>
            </div>

            <div className="properties-panel__info">
                <strong>Node ID:</strong> {selectedNode.id}
            </div>
        </div>
    );
};

export default PropertiesPanel;
