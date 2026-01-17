import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MilestoneService } from '../services/milestone.service';
import { Milestone } from '../entities/milestone.entity';

export interface GanttTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: string;
  dependencies: string[];
  assignee?: string;
  priority: string;
  color?: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: Date;
  type: 'milestone' | 'deadline' | 'meeting' | 'review';
  description?: string;
  status: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  tasks: KanbanTask[];
  color: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  assignee?: string;
  priority: string;
  dueDate?: Date;
  tags: string[];
  storyPoints?: number;
}

@Component({
  selector: 'app-milestone-visualization',
  templateUrl: './milestone-visualization.component.html',
  styleUrls: ['./milestone-visualization.component.css']
})
export class MilestoneVisualizationComponent implements OnInit, AfterViewInit {
  @ViewChild('ganttChart', { static: true }) ganttChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('timeline', { static: true }) timeline!: ElementRef<HTMLDivElement>;
  @ViewChild('kanbanBoard', { static: true }) kanbanBoard!: ElementRef<HTMLDivElement>;
  
  milestones: Milestone[] = [];
  ganttTasks: GanttTask[] = [];
  timelineEvents: TimelineEvent[] = [];
  kanbanColumns: KanbanColumn[] = [];
  
  currentView: 'gantt' | 'timeline' | 'kanban' = 'gantt';
  selectedDateRange: 'week' | 'month' | 'quarter' | 'year' = 'month';
  
  // Gantt chart properties
  ganttStartDate: Date = new Date();
  ganttEndDate: Date = new Date();
  ganttDayWidth = 30;
  ganttRowHeight = 40;
  ganttHeaderHeight = 60;
  
  constructor(private milestoneService: MilestoneService) {}

  ngOnInit(): void {
    this.loadData();
    this.initializeViews();
  }

  ngAfterViewInit(): void {
    this.renderCurrentView();
  }

  private loadData(): void {
    // Load milestones from service
    this.milestoneService.findAllMilestones('default-tenant').subscribe({
      next: (data) => {
        this.milestones = data.milestones;
        this.transformDataForVisualization();
      },
      error: (error) => {
        console.error('Error loading milestones:', error);
      }
    });
  }

  private initializeViews(): void {
    // Set date range based on current selection
    this.updateDateRange();
    
    // Initialize kanban columns
    this.kanbanColumns = [
      {
        id: 'not-started',
        title: 'Not Started',
        status: 'NOT_STARTED',
        tasks: [],
        color: '#d9d9d9'
      },
      {
        id: 'in-progress',
        title: 'In Progress',
        status: 'IN_PROGRESS',
        tasks: [],
        color: '#1890ff'
      },
      {
        id: 'under-review',
        title: 'Under Review',
        status: 'UNDER_REVIEW',
        tasks: [],
        color: '#fa8c16'
      },
      {
        id: 'completed',
        title: 'Completed',
        status: 'COMPLETED',
        tasks: [],
        color: '#52c41a'
      },
      {
        id: 'blocked',
        title: 'Blocked',
        status: 'BLOCKED',
        tasks: [],
        color: '#f5222d'
      }
    ];
  }

  private transformDataForVisualization(): void {
    // Transform milestones to Gantt tasks
    this.ganttTasks = this.milestones.map(milestone => ({
      id: milestone.id,
      name: milestone.name,
      startDate: new Date(milestone.startDate || milestone.createdAt),
      endDate: new Date(milestone.targetDate || milestone.dueDate),
      progress: milestone.progressPercentage || 0,
      status: milestone.status,
      dependencies: milestone.dependencies || [],
      assignee: milestone.ownerId,
      priority: milestone.priority || 'medium',
      color: this.getTaskColor(milestone.status)
    }));

    // Transform milestones to timeline events
    this.timelineEvents = this.milestones.map(milestone => ({
      id: milestone.id,
      title: milestone.name,
      date: new Date(milestone.targetDate || milestone.dueDate),
      type: 'milestone' as const,
      description: milestone.description,
      status: milestone.status
    }));

    // Transform milestones to kanban tasks
    this.kanbanColumns.forEach(column => {
      column.tasks = this.milestones
        .filter(milestone => milestone.status === column.status)
        .map(milestone => ({
          id: milestone.id,
          title: milestone.name,
          description: milestone.description || '',
          assignee: milestone.ownerId,
          priority: milestone.priority || 'medium',
          dueDate: milestone.dueDate ? new Date(milestone.dueDate) : undefined,
          tags: milestone.tags || [],
          storyPoints: this.calculateStoryPoints(milestone)
        }));
    });
  }

  private getTaskColor(status: string): string {
    const colors = {
      'NOT_STARTED': '#d9d9d9',
      'IN_PROGRESS': '#1890ff',
      'UNDER_REVIEW': '#fa8c16',
      'COMPLETED': '#52c41a',
      'BLOCKED': '#f5222d',
      'CANCELLED': '#8c8c8c'
    };
    return colors[status] || '#1890ff';
  }

  private calculateStoryPoints(milestone: Milestone): number {
    // Simple calculation based on complexity and duration
    const complexity = milestone.complexity || 1;
    const duration = milestone.durationDays || 1;
    return Math.round((complexity * duration) / 5);
  }

  private updateDateRange(): void {
    const now = new Date();
    
    switch (this.selectedDateRange) {
      case 'week':
        this.ganttStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        this.ganttEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        this.ganttStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        this.ganttEndDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        this.ganttStartDate = new Date(now.getFullYear(), quarter * 3 - 1, 1);
        this.ganttEndDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'year':
        this.ganttStartDate = new Date(now.getFullYear() - 1, 0, 1);
        this.ganttEndDate = new Date(now.getFullYear() + 1, 11, 31);
        break;
    }
  }

  private renderCurrentView(): void {
    switch (this.currentView) {
      case 'gantt':
        this.renderGanttChart();
        break;
      case 'timeline':
        this.renderTimeline();
        break;
      case 'kanban':
        this.renderKanbanBoard();
        break;
    }
  }

  private renderGanttChart(): void {
    const canvas = this.ganttChart.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate dimensions
    const totalDays = Math.ceil((this.ganttEndDate.getTime() - this.ganttStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const chartWidth = totalDays * this.ganttDayWidth;
    const chartHeight = this.ganttTasks.length * this.ganttRowHeight + this.ganttHeaderHeight;
    
    // Draw background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid and dates
    this.drawGanttGrid(ctx, totalDays);
    
    // Draw tasks
    this.ganttTasks.forEach((task, index) => {
      this.drawGanttTask(ctx, task, index);
    });
    
    // Draw dependencies
    this.drawGanttDependencies(ctx);
  }

  private drawGanttGrid(ctx: CanvasRenderingContext2D, totalDays: number): void {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Draw vertical lines for days
    for (let i = 0; i <= totalDays; i++) {
      const x = i * this.ganttDayWidth;
      ctx.beginPath();
      ctx.moveTo(x, this.ganttHeaderHeight);
      ctx.lineTo(x, this.ganttChart.nativeElement.height);
      ctx.stroke();
    }
    
    // Draw horizontal lines for tasks
    for (let i = 0; i <= this.ganttTasks.length; i++) {
      const y = this.ganttHeaderHeight + i * this.ganttRowHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.ganttChart.nativeElement.width, y);
      ctx.stroke();
    }
    
    // Draw date headers
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < totalDays; i += 7) {
      const date = new Date(this.ganttStartDate.getTime() + i * 24 * 60 * 60 * 1000);
      const x = i * this.ganttDayWidth + this.ganttDayWidth / 2;
      ctx.fillText(date.toLocaleDateString(), x, 20);
    }
  }

  private drawGanttTask(ctx: CanvasRenderingContext2D, task: GanttTask, index: number): void {
    const taskStart = Math.max(0, (task.startDate.getTime() - this.ganttStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const taskDuration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const taskEnd = taskStart + taskDuration;
    
    const x = taskStart * this.ganttDayWidth;
    const y = this.ganttHeaderHeight + index * this.ganttRowHeight + 5;
    const width = taskDuration * this.ganttDayWidth - 2;
    const height = this.ganttRowHeight - 10;
    
    // Draw task bar
    ctx.fillStyle = task.color || '#1890ff';
    ctx.fillRect(x, y, width, height);
    
    // Draw progress bar
    if (task.progress > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(x, y, width * (task.progress / 100), height);
    }
    
    // Draw task name
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(task.name, x + 5, y + height / 2 + 4);
    
    // Draw progress percentage
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${task.progress}%`, x + width - 5, y + height / 2 + 3);
  }

  private drawGanttDependencies(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    
    this.ganttTasks.forEach(task => {
      task.dependencies.forEach(depId => {
        const depTask = this.ganttTasks.find(t => t.id === depId);
        if (depTask) {
          const fromX = (depTask.endDate.getTime() - this.ganttStartDate.getTime()) / (1000 * 60 * 60 * 24) * this.ganttDayWidth;
          const fromY = this.ganttHeaderHeight + this.ganttTasks.indexOf(depTask) * this.ganttRowHeight + this.ganttRowHeight / 2;
          
          const toX = (task.startDate.getTime() - this.ganttStartDate.getTime()) / (1000 * 60 * 60 * 24) * this.ganttDayWidth;
          const toY = this.ganttHeaderHeight + this.ganttTasks.indexOf(task) * this.ganttRowHeight + this.ganttRowHeight / 2;
          
          // Draw dependency arrow
          this.drawArrow(ctx, fromX, fromY, toX, toY);
        }
      });
    });
  }

  private drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number): void {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowLength * Math.cos(angle - arrowAngle),
      toY - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowLength * Math.cos(angle + arrowAngle),
      toY - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.stroke();
  }

  private renderTimeline(): void {
    const container = this.timeline.nativeElement;
    container.innerHTML = '';
    
    // Create timeline container
    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'timeline-container';
    timelineContainer.style.cssText = `
      position: relative;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 8px;
      overflow-x: auto;
    `;
    
    // Create timeline line
    const timelineLine = document.createElement('div');
    timelineLine.style.cssText = `
      position: absolute;
      left: 50px;
      top: 20px;
      bottom: 20px;
      width: 2px;
      background: #1890ff;
    `;
    
    // Sort events by date
    const sortedEvents = [...this.timelineEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Create timeline events
    sortedEvents.forEach((event, index) => {
      const eventElement = document.createElement('div');
      eventElement.className = 'timeline-event';
      eventElement.style.cssText = `
        position: relative;
        margin-left: 70px;
        margin-bottom: 20px;
        padding: 15px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border-left: 4px solid ${this.getEventTypeColor(event.type)};
      `;
      
      eventElement.innerHTML = `
        <div style="font-weight: bold; color: #333; margin-bottom: 5px;">${event.title}</div>
        <div style="color: #666; font-size: 12px; margin-bottom: 5px;">${event.date.toLocaleDateString()}</div>
        <div style="color: #999; font-size: 11px;">${event.description || ''}</div>
        <div style="margin-top: 8px;">
          <span style="background: ${this.getStatusColor(event.status)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px;">
            ${event.status}
          </span>
        </div>
      `;
      
      // Add dot to timeline
      const dot = document.createElement('div');
      dot.style.cssText = `
        position: absolute;
        left: -84px;
        top: 20px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${this.getEventTypeColor(event.type)};
        border: 2px solid white;
      `;
      
      eventElement.appendChild(dot);
      timelineContainer.appendChild(eventElement);
    });
    
    timelineContainer.appendChild(timelineLine);
    container.appendChild(timelineContainer);
  }

  private renderKanbanBoard(): void {
    const container = this.kanbanBoard.nativeElement;
    container.innerHTML = '';
    
    // Create kanban board container
    const boardContainer = document.createElement('div');
    boardContainer.className = 'kanban-board';
    boardContainer.style.cssText = `
      display: flex;
      gap: 20px;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 8px;
      overflow-x: auto;
      min-height: 500px;
    `;
    
    // Create columns
    this.kanbanColumns.forEach(column => {
      const columnElement = document.createElement('div');
      columnElement.className = 'kanban-column';
      columnElement.style.cssText = `
        flex: 1;
        min-width: 300px;
        background: ${column.color}20;
        border-radius: 8px;
        padding: 15px;
      `;
      
      // Column header
      const headerElement = document.createElement('div');
      headerElement.style.cssText = `
        font-weight: bold;
        color: #333;
        margin-bottom: 15px;
        padding: 10px;
        background: ${column.color};
        color: white;
        border-radius: 4px;
        text-align: center;
      `;
      headerElement.textContent = `${column.title} (${column.tasks.length})`;
      
      columnElement.appendChild(headerElement);
      
      // Tasks container
      const tasksContainer = document.createElement('div');
      tasksContainer.className = 'kanban-tasks';
      tasksContainer.style.cssText = `
        min-height: 300px;
      `;
      
      // Add tasks
      column.tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'kanban-task';
        taskElement.style.cssText = `
          background: white;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          cursor: move;
          transition: transform 0.2s;
        `;
        
        taskElement.innerHTML = `
          <div style="font-weight: bold; color: #333; margin-bottom: 8px;">${task.title}</div>
          <div style="color: #666; font-size: 12px; margin-bottom: 8px;">${task.description}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="background: ${this.getPriorityColor(task.priority)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">
              ${task.priority}
            </span>
            ${task.storyPoints ? `<span style="color: #999; font-size: 12px;">${task.storyPoints} pts</span>` : ''}
          </div>
          ${task.assignee ? `<div style="color: #999; font-size: 11px;">Assigned to: ${task.assignee}</div>` : ''}
          ${task.dueDate ? `<div style="color: #999; font-size: 11px;">Due: ${task.dueDate.toLocaleDateString()}</div>` : ''}
          ${task.tags.length > 0 ? `
            <div style="margin-top: 8px;">
              ${task.tags.map(tag => `<span style="background: #e0e0e0; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 4px;">${tag}</span>`).join('')}
            </div>
          ` : ''}
        `;
        
        // Add drag and drop functionality
        taskElement.draggable = true;
        taskElement.addEventListener('dragstart', (e) => {
          e.dataTransfer?.setData('taskId', task.id);
          e.dataTransfer?.setData('columnId', column.id);
        });
        
        tasksContainer.appendChild(taskElement);
      });
      
      // Add drop zone
      tasksContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      
      tasksContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const taskId = e.dataTransfer?.getData('taskId');
        const fromColumnId = e.dataTransfer?.getData('columnId');
        
        if (taskId && fromColumnId !== column.id) {
          this.moveTaskToColumn(taskId, fromColumnId, column.id);
        }
      });
      
      columnElement.appendChild(tasksContainer);
      boardContainer.appendChild(columnElement);
    });
    
    container.appendChild(boardContainer);
  }

  private getEventTypeColor(type: string): string {
    const colors = {
      'milestone': '#1890ff',
      'deadline': '#f5222d',
      'meeting': '#52c41a',
      'review': '#fa8c16'
    };
    return colors[type] || '#1890ff';
  }

  private getStatusColor(status: string): string {
    const colors = {
      'NOT_STARTED': '#d9d9d9',
      'IN_PROGRESS': '#1890ff',
      'UNDER_REVIEW': '#fa8c16',
      'COMPLETED': '#52c41a',
      'BLOCKED': '#f5222d'
    };
    return colors[status] || '#1890ff';
  }

  private getPriorityColor(priority: string): string {
    const colors = {
      'low': '#52c41a',
      'medium': '#fa8c16',
      'high': '#f5222d',
      'critical': '#722ed1'
    };
    return colors[priority] || '#fa8c16';
  }

  private moveTaskToColumn(taskId: string, fromColumnId: string, toColumnId: string): void {
    const fromColumn = this.kanbanColumns.find(c => c.id === fromColumnId);
    const toColumn = this.kanbanColumns.find(c => c.id === toColumnId);
    
    if (fromColumn && toColumn) {
      const taskIndex = fromColumn.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        const task = fromColumn.tasks.splice(taskIndex, 1)[0];
        toColumn.tasks.push(task);
        
        // Update milestone status
        this.updateMilestoneStatus(taskId, toColumn.status);
        
        // Re-render kanban board
        this.renderKanbanBoard();
      }
    }
  }

  private updateMilestoneStatus(taskId: string, newStatus: string): void {
    const milestone = this.milestones.find(m => m.id === taskId);
    if (milestone) {
      milestone.status = newStatus;
      // Update milestone in service
      this.milestoneService.updateMilestone(taskId, { status: newStatus }, 'system').subscribe({
        next: () => {
          console.log('Milestone status updated successfully');
        },
        error: (error) => {
          console.error('Error updating milestone status:', error);
        }
      });
    }
  }

  // Public methods for view switching
  public switchView(view: 'gantt' | 'timeline' | 'kanban'): void {
    this.currentView = view;
    this.renderCurrentView();
  }

  public setDateRange(range: 'week' | 'month' | 'quarter' | 'year'): void {
    this.selectedDateRange = range;
    this.updateDateRange();
    this.renderCurrentView();
  }

  public exportData(): void {
    const data = {
      view: this.currentView,
      dateRange: this.selectedDateRange,
      milestones: this.milestones,
      ganttTasks: this.ganttTasks,
      timelineEvents: this.timelineEvents,
      kanbanColumns: this.kanbanColumns
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `milestone-visualization-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public printChart(): void {
    window.print();
  }

  public refreshData(): void {
    this.loadData();
  }

  public filterByStatus(status: string): void {
    // Filter milestones by status and update visualizations
    const filteredMilestones = this.milestones.filter(m => m.status === status);
    this.transformDataForVisualization();
    this.renderCurrentView();
  }

  public filterByAssignee(assigneeId: string): void {
    // Filter milestones by assignee and update visualizations
    const filteredMilestones = this.milestones.filter(m => m.ownerId === assigneeId);
    this.transformDataForVisualization();
    this.renderCurrentView();
  }

  public searchMilestones(query: string): void {
    // Search milestones and update visualizations
    const filteredMilestones = this.milestones.filter(m => 
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.description?.toLowerCase().includes(query.toLowerCase())
    );
    this.transformDataForVisualization();
    this.renderCurrentView();
  }
}
