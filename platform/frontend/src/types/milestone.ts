export interface Project {
    id: string;
    name: string;
    clientName: string;
    status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
    startDate: string;
    totalValue: number;
}

export interface Milestone {
    id: string;
    projectId: string;
    title: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED';
    dueDate: string;
    amount: number;
}
