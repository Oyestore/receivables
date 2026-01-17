export interface Campaign {
    id: string;
    name: string;
    channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
    status: 'DRAFT' | 'SCHEDULED' | 'SENT';
    scheduledDate?: string;
    stats?: {
        sent: number;
        opened: number;
        clicks: number;
    };
}

export interface Lead {
    id: string;
    name: string;
    email: string;
    status: 'NEW' | 'CONTACTED' | 'CONVERTED';
}
