import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../entities/lead.entity';

@Injectable()
export class LeadService {
    constructor(
        @InjectRepository(Lead)
        private readonly leadRepository: Repository<Lead>,
    ) { }

    async create(createLeadDto: Partial<Lead>): Promise<Lead> {
        const lead = this.leadRepository.create(createLeadDto);
        // Initial scoring logic could go here
        lead.score = this.calculateInitialScore(lead);
        return this.leadRepository.save(lead);
    }

    async findAll(): Promise<Lead[]> {
        return this.leadRepository.find();
    }

    async findOne(id: string): Promise<Lead> {
        const lead = await this.leadRepository.findOne({ where: { id } });
        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }
        return lead;
    }

    async update(id: string, updateLeadDto: Partial<Lead>): Promise<Lead> {
        const lead = await this.findOne(id);
        Object.assign(lead, updateLeadDto);
        return this.leadRepository.save(lead);
    }

    async remove(id: string): Promise<void> {
        const lead = await this.findOne(id);
        await this.leadRepository.remove(lead);
    }

    async updateStatus(id: string, status: LeadStatus): Promise<Lead> {
        const lead = await this.findOne(id);
        lead.status = status;
        return this.leadRepository.save(lead);
    }

    async calculateScore(id: string): Promise<Lead> {
        const lead = await this.findOne(id);
        lead.score = this.calculateInitialScore(lead);
        // Add more complex logic here (e.g., engagement based)
        return this.leadRepository.save(lead);
    }

    private calculateInitialScore(lead: Partial<Lead>): number {
        let score = 0;
        if (lead.email && !lead.email.includes('gmail.com') && !lead.email.includes('yahoo.com')) {
            score += 10; // Business email bonus
        }
        if (lead.companyName) {
            score += 5;
        }
        if (lead.phone) {
            score += 5;
        }
        return score;
    }
}
