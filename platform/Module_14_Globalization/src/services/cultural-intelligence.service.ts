import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CulturalNormEntity } from '../entities/enhanced-globalization.entity';

@Injectable()
export class CulturalIntelligenceService {
    private readonly logger = new Logger(CulturalIntelligenceService.name);

    constructor(
        @InjectRepository(CulturalNormEntity)
        private cultureRepo: Repository<CulturalNormEntity>
    ) { }

    /**
     * Get validated business culture insights
     */
    async getPaymentCulture(countryCode: string) {
        let culture = await this.cultureRepo.findOne({ where: { countryCode } });

        if (!culture) {
            // Lazy load default/mock data if not found (In prod: seed database)
            culture = await this.seedDefaultCulture(countryCode);
        }

        return {
            typicalPaymentTerms: culture.paymentBehavior?.contractTerms || 30,
            actualPaymentWindow: culture.paymentBehavior?.actualPayment || 30,
            latenessThreshold: culture.paymentBehavior?.lateThreshold || 30,
            communicationStyle: culture.communicationPreferences || { formality: 'medium', directness: 'balanced' },
            bestTiming: {
                firstReminder: culture.reminderStrategy?.firstReminderDays || 5,
                escalationInterval: culture.reminderStrategy?.escalationInterval || 7
            }
        };
    }

    /**
     * Adapt message tone and content based on cultural norms
     */
    async adaptMessage(params: { message: string; targetCountry: string; type: 'reminder' | 'negotiation' }) {
        const culture = await this.getPaymentCulture(params.targetCountry);
        const { formality, directness } = culture.communicationStyle;

        let adapted = params.message;
        const changes: string[] = [];

        // 1. Formality Adjustment
        if (formality === 'high') {
            adapted = this.increaseFormality(adapted);
            changes.push('Increased formality (High formality culture)');
        }

        // 2. Directness Adjustment (Indirect cultures need softening)
        if (directness === 'indirect') {
            adapted = this.softenDirectness(adapted);
            changes.push('Softened direct language (Relationship-based culture)');
        }

        // 3. Cultural Courtesy Injection
        const courtesy = this.getCulturalCourtesy(params.targetCountry);
        if (courtesy) {
            adapted = `${courtesy.start}\n\n${adapted}\n\n${courtesy.end}`;
            changes.push('Added culturally appropriate greetings');
        }

        return {
            original: params.message,
            adapted: adapted,
            changes: changes,
            culturalNotes: [`Target culture (${params.targetCountry}) prefers ${directness} communication.`]
        };
    }

    // --- Helpers (Primitive NLP logic for MVP) ---

    private increaseFormality(text: string): string {
        return text.replace(/Hi /g, 'Dear ')
            .replace(/Hey /g, 'Dear ')
            .replace(/Thanks/g, 'Sincerely');
    }

    private softenDirectness(text: string): string {
        return text.replace(/Pay immediately/g, 'We kindly request payment at your earliest convenience')
            .replace(/Overdue/g, 'Outstanding balance');
    }

    private getCulturalCourtesy(country: string) {
        const greetings = {
            'JP': { start: 'いつもお世話になっております (Thank you for your continued support).', end: 'よろしくお願いいたします (Best regards).' },
            'AE': { start: 'As-salamu alaykum,', end: 'Shukran,' },
            'IN': { start: 'Greetings,', end: 'Warm regards,' },
            'DE': { start: 'Sehr geehrte Damen und Herren,', end: 'Mit freundlichen Grüßen,' }
        };
        return greetings[country] || null;
    }

    private async seedDefaultCulture(countryCode: string): Promise<CulturalNormEntity> {
        // Basic fallback seeding for immediate utility
        const defaults: Partial<CulturalNormEntity> = {
            countryCode,
            countryName: countryCode,
            paymentBehavior: { contractTerms: 30, actualPayment: 30, acceptableDelay: 0, lateThreshold: 30 },
            communicationPreferences: { formality: 'medium', directness: 'balanced', preferredChannels: ['email'], businessHours: { start: '09:00', end: '17:00' }, avoidDays: [] },
            businessCulture: { relationshipImportance: 5, directnessLevel: 5, negotiationStyle: 'standard', decisionSpeed: 'medium' }
        };

        // Specific overrides for key markets
        if (countryCode === 'JP') {
            defaults.paymentBehavior = { contractTerms: 30, actualPayment: 60, acceptableDelay: 0, lateThreshold: 60 };
            defaults.communicationPreferences = { formality: 'high', directness: 'indirect', preferredChannels: ['email'], businessHours: { start: '09:00', end: '18:00' }, avoidDays: [] };
        } else if (countryCode === 'AE') {
            defaults.communicationPreferences = { formality: 'high', directness: 'balanced', preferredChannels: ['whatsapp', 'phone'], businessHours: { start: '08:00', end: '13:00' }, avoidDays: ['Friday'] };
        }

        const entity = this.cultureRepo.create(defaults);
        return await this.cultureRepo.save(entity);
    }
}
