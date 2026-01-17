/**
 * Event Builder - Main Container
 * Visual workflow designer for payment events using React Flow
 */

import React, { useState, useCallback } from 'react';
import { ReactFlow, Node, Edge, Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge, NodeChange, EdgeChange, Connection, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NodeLibrary } from './NodeLibrary';
import { PropertiesPanel } from './PropertiesPanel';
import { EventNode } from './nodes/EventNode';
import { EventType } from '../../types/events';

import './EventBuilder.css';

// Custom node types
const nodeTypes = {
    eventNode: EventNode
};

export interface EventNodeData extends Record<string, unknown> {
    label: string;
    eventType: EventType;
    paymentAmount?: number;
    paymentPercentage?: number;
    description?: string;
}

export const EventBuilder: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    // Handle node changes (position, selection, etc.)
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );

    // Handle edge changes
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    // Handle new connections
    const onConnect = useCallback(
        (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
        []
    );

    // Handle node click
    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    // Add new event node to canvas
    const addEventNode = useCallback((eventType: EventType) => {
        const newNode: Node = {
            id: `event-${Date.now()}`,
            type: 'eventNode',
            position: {
                x: Math.random() * 400 + 100,
                y: Math.random() * 300 + 100
            },
            data: {
                label: `New ${eventType} Event`,
                eventType,
                paymentAmount: 0,
                paymentPercentage: 0,
                description: '',
            } as EventNodeData,
        };

        setNodes((nds) => [...nds, newNode]);
        setSelectedNode(newNode);
    }, []);

    // Update node properties
    const updateNodeProperties = useCallback((nodeId: string, data: Partial<EventNodeData>) => {
        setNodes((nds) =>
            nds.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...data } }
                    : node
            )
        );
    }, []);

    // Delete selected node
    const deleteSelectedNode = useCallback(() => {
        if (selectedNode) {
            setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
            setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
            setSelectedNode(null);
        }
    }, [selectedNode]);

    // Save workflow
    const saveWorkflow = useCallback(async () => {
        const workflow = {
            nodes,
            edges
        };

        try {
            const response = await fetch('/api/events/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workflow)
            });

            if (response.ok) {
                alert('Workflow saved successfully!');
            }
        } catch (error) {
            console.error('Failed to save workflow:', error);
            alert('Failed to save workflow');
        }
    }, [nodes, edges]);

    return (
        <div className="event-builder">
            <div className="event-builder__header">
                <h2>Payment Event Workflow Designer</h2>
                <div className="event-builder__actions">
                    <button onClick={saveWorkflow} className="btn btn-primary">
                        Save Workflow
                    </button>
                    <button onClick={deleteSelectedNode} className="btn btn-danger" disabled={!selectedNode}>
                        Delete Selected
                    </button>
                </div>
            </div>

            <div className="event-builder__content">
                {/* Node Library (Left Sidebar) */}
                <div className="event-builder__library">
                    <NodeLibrary onAddNode={addEventNode} />
                </div>

                {/* React Flow Canvas (Center) */}
                <div className="event-builder__canvas">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes}
                        fitView
                    >
                        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
                        <Controls />
                    </ReactFlow>
                </div>

                {/* Properties Panel (Right Sidebar) */}
                <div className="event-builder__properties">
                    <PropertiesPanel
                        selectedNode={selectedNode}
                        onUpdateProperties={(data) => {
                            if (selectedNode) {
                                updateNodeProperties(selectedNode.id, data);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default EventBuilder;
