import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowDefinition } from '../entities/workflow-definition.entity';
import { CreateWorkflowDefinitionDto } from '../dto/create-workflow-definition.dto';

export interface WorkflowNode {
  id: string;
  type: 'start' | 'task' | 'decision' | 'parallel' | 'merge' | 'end';
  name: string;
  description?: string;
  position: { x: number; y: number };
  data?: any;
  inputParameters?: any;
  outputParameters?: any;
  conditions?: any;
  transitions?: any;
  metadata?: any;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  condition?: string;
  label?: string;
}

export interface WorkflowStructure {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

@Component({
  selector: 'app-workflow-designer',
  templateUrl: './workflow-designer.component.html',
  styleUrls: ['./workflow-designer.component.css']
})
export class WorkflowDesignerComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  
  workflowDefinition: WorkflowDefinition | null = null;
  workflowStructure: WorkflowStructure = {
    nodes: [],
    edges: []
  };
  
  selectedNode: WorkflowNode | null = null;
  selectedEdge: WorkflowEdge | null = null;
  isDragging = false;
  dragOffset = { x: 0, y: 0 };
  
  nodeTypes = [
    { value: 'start', label: 'Start Node', icon: 'play-circle' },
    { value: 'task', label: 'Task Node', icon: 'check-square' },
    { value: 'decision', label: 'Decision Node', icon: 'fork' },
    { value: 'parallel', label: 'Parallel Node', icon: 'split-cells' },
    { value: 'merge', label: 'Merge Node', icon: 'merge' },
    { value: 'end', label: 'End Node', icon: 'stop-circle' }
  ];
  
  constructor(private workflowService: WorkflowService) {}

  ngOnInit(): void {
    this.initializeCanvas();
    this.loadWorkflowDefinition();
  }

  private initializeCanvas(): void {
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Set canvas size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      // Add event listeners
      canvas.addEventListener('mousedown', this.onCanvasMouseDown.bind(this));
      canvas.addEventListener('mousemove', this.onCanvasMouseMove.bind(this));
      canvas.addEventListener('mouseup', this.onCanvasMouseUp.bind(this));
      canvas.addEventListener('dblclick', this.onCanvasDoubleClick.bind(this));
      
      // Enable drag and drop
      canvas.addEventListener('dragover', this.onDragOver.bind(this));
      canvas.addEventListener('drop', this.onDrop.bind(this));
    }
  }

  private loadWorkflowDefinition(): void {
    // Load existing workflow definition if editing
    // For now, create a default structure
    this.createDefaultWorkflow();
  }

  private createDefaultWorkflow(): void {
    this.workflowStructure = {
      nodes: [
        {
          id: 'start',
          type: 'start',
          name: 'Start',
          position: { x: 100, y: 200 },
          description: 'Workflow start point'
        },
        {
          id: 'task1',
          type: 'task',
          name: 'Initial Task',
          position: { x: 300, y: 200 },
          description: 'First task in the workflow'
        },
        {
          id: 'end',
          type: 'end',
          name: 'End',
          position: { x: 500, y: 200 },
          description: 'Workflow end point'
        }
      ],
      edges: [
        {
          id: 'edge1',
          from: 'start',
          to: 'task1',
          label: 'Start to Task'
        },
        {
          id: 'edge2',
          from: 'task1',
          to: 'end',
          label: 'Task to End'
        }
      ]
    };
    
    this.renderCanvas();
  }

  private renderCanvas(): void {
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    this.drawGrid(ctx);
    
    // Draw edges
    this.workflowStructure.edges.forEach(edge => {
      this.drawEdge(ctx, edge);
    });
    
    // Draw nodes
    this.workflowStructure.nodes.forEach(node => {
      this.drawNode(ctx, node);
    });
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const gridSize = 20;
    const canvas = this.canvas.nativeElement;
    
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  private drawNode(ctx: CanvasRenderingContext2D, node: WorkflowNode): void {
    const nodeSize = 80;
    const nodeColors = {
      start: '#52c41a',
      task: '#1890ff',
      decision: '#fa8c16',
      parallel: '#722ed1',
      merge: '#13c2c2',
      end: '#f5222d'
    };
    
    const color = nodeColors[node.type] || '#1890ff';
    
    // Draw node shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw node shape based on type
    switch (node.type) {
      case 'start':
      case 'end':
        this.drawCircleNode(ctx, node, nodeSize, color);
        break;
      case 'decision':
        this.drawDiamondNode(ctx, node, nodeSize, color);
        break;
      case 'parallel':
      case 'merge':
        this.drawRectangleNode(ctx, node, nodeSize, color);
        break;
      default:
        this.drawRectangleNode(ctx, node, nodeSize, color);
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw node text
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Truncate text if too long
    const maxTextLength = 10;
    const displayName = node.name.length > maxTextLength 
      ? node.name.substring(0, maxTextLength) + '...' 
      : node.name;
    
    ctx.fillText(displayName, node.position.x, node.position.y);
  }

  private drawCircleNode(ctx: CanvasRenderingContext2D, node: WorkflowNode, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.position.x, node.position.y, size / 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw border if selected
    if (this.selectedNode?.id === node.id) {
      ctx.strokeStyle = '#1890ff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  private drawRectangleNode(ctx: CanvasRenderingContext2D, node: WorkflowNode, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(
      node.position.x - size / 2,
      node.position.y - size / 2,
      size,
      size
    );
    
    // Draw border if selected
    if (this.selectedNode?.id === node.id) {
      ctx.strokeStyle = '#1890ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        node.position.x - size / 2,
        node.position.y - size / 2,
        size,
        size
      );
    }
  }

  private drawDiamondNode(ctx: CanvasRenderingContext2D, node: WorkflowNode, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(node.position.x, node.position.y - size / 2);
    ctx.lineTo(node.position.x + size / 2, node.position.y);
    ctx.lineTo(node.position.x, node.position.y + size / 2);
    ctx.lineTo(node.position.x - size / 2, node.position.y);
    ctx.closePath();
    ctx.fill();
    
    // Draw border if selected
    if (this.selectedNode?.id === node.id) {
      ctx.strokeStyle = '#1890ff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  private drawEdge(ctx: CanvasRenderingContext2D, edge: WorkflowEdge): void {
    const fromNode = this.workflowStructure.nodes.find(n => n.id === edge.from);
    const toNode = this.workflowStructure.nodes.find(n => n.id === edge.to);
    
    if (!fromNode || !toNode) return;
    
    ctx.strokeStyle = this.selectedEdge?.id === edge.id ? '#1890ff' : '#d9d9d9';
    ctx.lineWidth = this.selectedEdge?.id === edge.id ? 3 : 2;
    
    // Draw arrow line
    ctx.beginPath();
    ctx.moveTo(fromNode.position.x, fromNode.position.y);
    ctx.lineTo(toNode.position.x, toNode.position.y);
    ctx.stroke();
    
    // Draw arrowhead
    this.drawArrowhead(ctx, fromNode.position, toNode.position);
    
    // Draw edge label if exists
    if (edge.label) {
      const midX = (fromNode.position.x + toNode.position.x) / 2;
      const midY = (fromNode.position.y + toNode.position.y) / 2;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(midX - 30, midY - 10, 60, 20);
      
      ctx.fillStyle = '#666666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(edge.label, midX, midY);
    }
  }

  private drawArrowhead(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }): void {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowLength = 15;
    const arrowAngle = Math.PI / 6;
    
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - arrowLength * Math.cos(angle - arrowAngle),
      to.y - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - arrowLength * Math.cos(angle + arrowAngle),
      to.y - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.stroke();
  }

  private onCanvasMouseDown(event: MouseEvent): void {
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Check if clicking on a node
    const clickedNode = this.findNodeAtPosition(x, y);
    if (clickedNode) {
      this.selectedNode = clickedNode;
      this.selectedEdge = null;
      this.isDragging = true;
      this.dragOffset = {
        x: x - clickedNode.position.x,
        y: y - clickedNode.position.y
      };
    } else {
      // Check if clicking on an edge
      const clickedEdge = this.findEdgeAtPosition(x, y);
      if (clickedEdge) {
        this.selectedEdge = clickedEdge;
        this.selectedNode = null;
      } else {
        // Deselect if clicking on empty space
        this.selectedNode = null;
        this.selectedEdge = null;
      }
    }
    
    this.renderCanvas();
  }

  private onCanvasMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.selectedNode) return;
    
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Update node position
    this.selectedNode.position.x = x - this.dragOffset.x;
    this.selectedNode.position.y = y - this.dragOffset.y;
    
    // Snap to grid
    this.selectedNode.position.x = Math.round(this.selectedNode.position.x / 20) * 20;
    this.selectedNode.position.y = Math.round(this.selectedNode.position.y / 20) * 20;
    
    this.renderCanvas();
  }

  private onCanvasMouseUp(event: MouseEvent): void {
    this.isDragging = false;
  }

  private onCanvasDoubleClick(event: MouseEvent): void {
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const clickedNode = this.findNodeAtPosition(x, y);
    if (clickedNode) {
      this.openNodeEditor(clickedNode);
    }
  }

  private onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private onDrop(event: DragEvent): void {
    event.preventDefault();
    
    const nodeType = event.dataTransfer?.getData('nodeType');
    if (nodeType) {
      const rect = this.canvas.nativeElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      this.addNode(nodeType, x, y);
    }
  }

  private findNodeAtPosition(x: number, y: number): WorkflowNode | null {
    const nodeSize = 80;
    
    for (const node of this.workflowStructure.nodes) {
      const distance = Math.sqrt(
        Math.pow(x - node.position.x, 2) + 
        Math.pow(y - node.position.y, 2)
      );
      
      if (distance <= nodeSize / 2) {
        return node;
      }
    }
    
    return null;
  }

  private findEdgeAtPosition(x: number, y: number): WorkflowEdge | null {
    for (const edge of this.workflowStructure.edges) {
      const fromNode = this.workflowStructure.nodes.find(n => n.id === edge.from);
      const toNode = this.workflowStructure.nodes.find(n => n.id === edge.to);
      
      if (!fromNode || !toNode) continue;
      
      // Check if point is near the edge line
      const distance = this.pointToLineDistance(
        { x, y },
        fromNode.position,
        toNode.position
      );
      
      if (distance < 5) {
        return edge;
      }
    }
    
    return null;
  }

  private pointToLineDistance(point: { x: number; y: number }, lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  private addNode(type: string, x: number, y: number): void {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: type as any,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      position: { x, y },
      description: `New ${type} node`
    };
    
    this.workflowStructure.nodes.push(newNode);
    this.renderCanvas();
  }

  private openNodeEditor(node: WorkflowNode): void {
    // Open node editor dialog
    console.log('Opening editor for node:', node);
    // This would open a modal or dialog for editing node properties
  }

  // Public methods for workflow management
  public addNodeOfType(type: string): void {
    const centerX = this.canvas.nativeElement.width / 2;
    const centerY = this.canvas.nativeElement.height / 2;
    this.addNode(type, centerX, centerY);
  }

  public deleteSelectedNode(): void {
    if (this.selectedNode) {
      // Remove node
      this.workflowStructure.nodes = this.workflowStructure.nodes.filter(
        n => n.id !== this.selectedNode!.id
      );
      
      // Remove connected edges
      this.workflowStructure.edges = this.workflowStructure.edges.filter(
        e => e.from !== this.selectedNode!.id && e.to !== this.selectedNode!.id
      );
      
      this.selectedNode = null;
      this.renderCanvas();
    }
  }

  public deleteSelectedEdge(): void {
    if (this.selectedEdge) {
      this.workflowStructure.edges = this.workflowStructure.edges.filter(
        e => e.id !== this.selectedEdge!.id
      );
      
      this.selectedEdge = null;
      this.renderCanvas();
    }
  }

  public connectNodes(fromId: string, toId: string): void {
    const newEdge: WorkflowEdge = {
      id: `edge_${Date.now()}`,
      from: fromId,
      to: toId,
      label: 'Connection'
    };
    
    this.workflowStructure.edges.push(newEdge);
    this.renderCanvas();
  }

  public saveWorkflow(): void {
    if (this.workflowDefinition) {
      // Update existing workflow
      const updateDto = {
        workflowStructure: this.workflowStructure
      };
      
      this.workflowService.updateWorkflowDefinition(
        this.workflowDefinition.id,
        updateDto,
        'current-user'
      ).subscribe({
        next: (result) => {
          console.log('Workflow saved successfully:', result);
        },
        error: (error) => {
          console.error('Error saving workflow:', error);
        }
      });
    } else {
      // Create new workflow
      const createDto: CreateWorkflowDefinitionDto = {
        name: 'New Workflow',
        tenantId: 'default-tenant',
        workflowStructure: this.workflowStructure
      };
      
      this.workflowService.createWorkflowDefinition(createDto, 'current-user').subscribe({
        next: (result) => {
          console.log('Workflow created successfully:', result);
          this.workflowDefinition = result;
        },
        error: (error) => {
          console.error('Error creating workflow:', error);
        }
      });
    }
  }

  public validateWorkflow(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for at least one start node
    const startNodes = this.workflowStructure.nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('Workflow must have at least one start node');
    }
    
    // Check for at least one end node
    const endNodes = this.workflowStructure.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('Workflow must have at least one end node');
    }
    
    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();
    this.workflowStructure.edges.forEach(edge => {
      connectedNodeIds.add(edge.from);
      connectedNodeIds.add(edge.to);
    });
    
    this.workflowStructure.nodes.forEach(node => {
      if (!connectedNodeIds.has(node.id) && node.type !== 'start') {
        errors.push(`Node "${node.name}" is disconnected from the workflow`);
      }
    });
    
    // Check for circular references
    if (this.hasCircularReference()) {
      errors.push('Workflow contains circular references');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private hasCircularReference(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Circular reference detected
      }
      
      if (visited.has(nodeId)) {
        return false;
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const outgoingEdges = this.workflowStructure.edges.filter(e => e.from === nodeId);
      for (const edge of outgoingEdges) {
        if (dfs(edge.to)) {
          return true;
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    for (const node of this.workflowStructure.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }
    
    return false;
  }

  public exportWorkflow(): string {
    return JSON.stringify(this.workflowStructure, null, 2);
  }

  public importWorkflow(workflowJson: string): void {
    try {
      const imported = JSON.parse(workflowJson);
      this.workflowStructure = imported;
      this.renderCanvas();
    } catch (error) {
      console.error('Error importing workflow:', error);
    }
  }

  public clearCanvas(): void {
    this.workflowStructure = {
      nodes: [],
      edges: []
    };
    this.selectedNode = null;
    this.selectedEdge = null;
    this.renderCanvas();
  }
}
