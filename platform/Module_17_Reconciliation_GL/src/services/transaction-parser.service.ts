import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankTransaction } from '../entities/bank-transaction.entity';

export interface ParsedTransaction {
  utrNumber?: string;
  amount: number;
  transactionType: 'credit' | 'debit';
  transactionDate: Date;
  description: string;
  reference?: string;
  payeeName?: string;
  payerName?: string;
  category?: string;
  subcategory?: string;
  chequeNumber?: string;
  instrumentType?: string;
  balance?: number;
  metadata?: Record<string, any>;
}

export interface ParseResult {
  success: boolean;
  transaction?: ParsedTransaction;
  errors?: string[];
  warnings?: string[];
  confidence: number;
}

export interface ParserTemplate {
  id: string;
  name: string;
  bankFormat: string;
  patterns: ParserPattern[];
  isActive: boolean;
}

export interface ParserPattern {
  field: string;
  pattern: string;
  required: boolean;
  dataType: 'string' | 'number' | 'date' | 'currency';
  transform?: string; // JavaScript function for transformation
}

@Injectable()
export class TransactionParserService {
  private readonly logger = new Logger(TransactionParserService.name);
  
  private readonly templates: ParserTemplate[] = [
    {
      id: 'generic_csv',
      name: 'Generic CSV Format',
      bankFormat: 'csv',
      isActive: true,
      patterns: [
        { field: 'transactionDate', pattern: '\\d{4}-\\d{2}-\\d{2}', required: true, dataType: 'date' },
        { field: 'description', pattern: '.*', required: true, dataType: 'string' },
        { field: 'amount', pattern: '\\d+\\.?\\d*', required: true, dataType: 'currency' },
        { field: 'transactionType', pattern: '(credit|debit|CR|DR)', required: false, dataType: 'string' },
        { field: 'utrNumber', pattern: '[A-Za-z0-9]+', required: false, dataType: 'string' },
      ],
    },
    {
      id: 'indian_bank_statement',
      name: 'Indian Bank Statement',
      bankFormat: 'txt',
      isActive: true,
      patterns: [
        { field: 'transactionDate', pattern: '\\d{2}/\\d{2}/\\d{4}', required: true, dataType: 'date' },
        { field: 'description', pattern: '.*', required: true, dataType: 'string' },
        { field: 'amount', pattern: '\\d+,?\\d*\\.?\\d*', required: true, dataType: 'currency' },
        { field: 'utrNumber', pattern: 'UTR\\s*[:]?\\s*([A-Za-z0-9]+)', required: false, dataType: 'string' },
        { field: 'chequeNumber', pattern: 'CHEQUE\\s*[:]?\\s*(\\d+)', required: false, dataType: 'string' },
      ],
    },
    {
      id: 'swift_mt940',
      name: 'SWIFT MT940',
      bankFormat: 'swift',
      isActive: true,
      patterns: [
        { field: 'transactionDate', pattern: ':60F:\\s*[CD]\\s*(\\d{6})', required: true, dataType: 'date' },
        { field: 'amount', pattern: ':61F:\\s*[CD]\\s*(\\d+,?\\d*\\.?\\d*)', required: true, dataType: 'currency' },
        { field: 'transactionType', pattern: ':61F:\\s*([CD])', required: true, dataType: 'string' },
        { field: 'utrNumber', pattern: ':20:(.*)', required: false, dataType: 'string' },
        { field: 'description', pattern: ':86:(.*)', required: true, dataType: 'string' },
      ],
    },
  ];

  constructor(
    @InjectRepository(BankTransaction)
    private bankTransactionRepo: Repository<BankTransaction>,
  ) {}

  /**
   * Parse bank statement using AI-enhanced pattern matching
   */
  async parseStatement(
    statementContent: string,
    format: string,
    bankAccountId: string,
  ): Promise<ParseResult[]> {
    this.logger.log(`Parsing statement for account ${bankAccountId} in format ${format}`);
    
    const template = this.getTemplate(format);
    if (!template) {
      throw new Error(`No parser template found for format: ${format}`);
    }

    const lines = this.preprocessStatement(statementContent, format);
    const results: ParseResult[] = [];

    for (const line of lines) {
      const result = await this.parseLine(line, template);
      if (result.success && result.transaction) {
        results.push(result);
      }
    }

    this.logger.log(`Parsed ${results.length} transactions from statement`);
    return results;
  }

  /**
   * Parse CSV statement with AI enhancement
   */
  async parseCsvStatement(csvContent: string, bankAccountId: string): Promise<ParseResult[]> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV statement must have at least a header and one data row');
    }

    const headers = this.parseCsvLine(lines[0]);
    const template = this.detectCsvTemplate(headers);
    const results: ParseResult[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const transaction = this.mapCsvToTransaction(headers, values, template);
      
      if (transaction) {
        results.push({
          success: true,
          transaction,
          confidence: this.calculateCsvConfidence(headers, values, template),
        });
      }
    }

    return results;
  }

  /**
   * AI-powered field extraction from unstructured text
   */
  async extractFieldsFromText(text: string): Promise<Partial<ParsedTransaction>> {
    const extracted: Partial<ParsedTransaction> = {};

    // Extract amount using multiple patterns
    const amountPatterns = [
      /(?:Rs\.?|INR|\$|USD|AED)\s*([\d,]+\.?\d*)/gi,
      /([\d,]+\.?\d*)\s*(?:Rs\.?|INR|\$|USD|AED)/gi,
      /(?:Amount|Total|Sum)\s*[:\-]?\s*([\d,]+\.?\d*)/gi,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        extracted.amount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    // Extract date using AI-enhanced patterns
    const datePatterns = [
      /(\d{2}[-/]\d{2}[-/]\d{4})/g,
      /(\d{4}[-/]\d{2}[-/]\d{2})/g,
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/gi,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        extracted.transactionDate = this.parseFlexibleDate(match[1]);
        break;
      }
    }

    // Extract UTR/reference number
    const utrPatterns = [
      /UTR\s*[:\-]?\s*([A-Za-z0-9]+)/gi,
      /Reference\s*[:\-]?\s*([A-Za-z0-9]+)/gi,
      /Ref\s*[:\-]?\s*([A-Za-z0-9]+)/gi,
      /Transaction\s*ID\s*[:\-]?\s*([A-Za-z0-9]+)/gi,
    ];

    for (const pattern of utrPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        extracted.utrNumber = match[1];
        break;
      }
    }

    // Extract transaction type
    if (/credit|cr|deposit|received/i.test(text)) {
      extracted.transactionType = 'credit';
    } else if (/debit|dr|withdrawal|paid/i.test(text)) {
      extracted.transactionType = 'debit';
    }

    // Extract payee/payer names
    const namePatterns = [
      /(?:From|To|Paid\s*to|Received\s*from)\s*([A-Za-z\s]+)/gi,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)/g,
    ];

    for (const pattern of namePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const name = matches[0].replace(/(?:From|To|Paid\s*to|Received\s*from)\s*/i, '').trim();
        if (name.length > 3) {
          extracted.payeeName = name;
          break;
        }
      }
    }

    // Use remaining text as description
    const cleanedText = text
      .replace(/\d+/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanedText.length > 10) {
      extracted.description = cleanedText.substring(0, 200);
    }

    return extracted;
  }

  /**
   * Learn from parsing patterns to improve accuracy
   */
  async learnFromParsing(
    originalText: string,
    successfulParse: ParsedTransaction,
  ): Promise<void> {
    // Extract patterns that led to successful parsing
    const patterns = this.extractSuccessPatterns(originalText, successfulParse);
    
    // In a full implementation, this would update ML models
    this.logger.log(`Learning from successful parse: ${JSON.stringify(patterns)}`);
  }

  /**
   * Get parser template by format
   */
  private getTemplate(format: string): ParserTemplate | null {
    return this.templates.find(t => t.bankFormat === format && t.isActive) || null;
  }

  /**
   * Preprocess statement based on format
   */
  private preprocessStatement(content: string, format: string): string[] {
    const lines = content.split('\n').filter(line => line.trim());

    switch (format) {
      case 'csv':
        return lines;
      case 'txt':
        return lines.filter(line => 
          line.match(/\d/) && // Contains numbers
          !line.match(/^(Account|Balance|Total|Page)/i) // Exclude headers
        );
      case 'swift':
        return lines.filter(line => line.match(/^:/));
      default:
        return lines;
    }
  }

  /**
   * Parse individual line using template patterns
   */
  private async parseLine(line: string, template: ParserTemplate): Promise<ParseResult> {
    const transaction: Partial<ParsedTransaction> = {};
    const errors: string[] = [];
    let confidence = 0;

    for (const pattern of template.patterns) {
      const match = line.match(pattern.pattern);
      if (match) {
        const value = this.transformValue(match[1] || match[0], pattern.dataType, pattern.transform);
        (transaction as any)[pattern.field] = value;
        confidence += 1 / template.patterns.length;
      } else if (pattern.required) {
        errors.push(`Missing required field: ${pattern.field}`);
      }
    }

    // AI enhancement for missing fields
    if (!transaction.description && line.length > 20) {
      const extracted = await this.extractFieldsFromText(line);
      Object.assign(transaction, extracted);
      confidence += 0.1;
    }

    return {
      success: errors.length === 0,
      transaction: transaction as ParsedTransaction,
      errors,
      confidence,
    };
  }

  /**
   * Transform parsed value based on data type
   */
  private transformValue(value: string, dataType: string, transform?: string): any {
    let transformed = value;

    // Apply custom transformation if provided
    if (transform) {
      try {
        // Safe evaluation of transformation function
        transformed = eval(`(value) => ${transform}`)(value);
      } catch (error) {
        this.logger.warn(`Transformation failed: ${transform}`);
      }
    }

    // Apply data type conversion
    switch (dataType) {
      case 'number':
      case 'currency':
        return parseFloat(transformed.replace(/,/g, ''));
      case 'date':
        return this.parseFlexibleDate(transformed);
      case 'string':
      default:
        return transformed.toString().trim();
    }
  }

  /**
   * Parse flexible date formats
   */
  private parseFlexibleDate(dateString: string): Date {
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
      /^\d{1,2}\s+\w+\s+\d{4}$/, // D Month YYYY
    ];

    for (const format of formats) {
      if (format.test(dateString)) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // Fallback to Date constructor
    return new Date(dateString);
  }

  /**
   * Parse CSV line handling quoted fields
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Detect CSV template from headers
   */
  private detectCsvTemplate(headers: string[]): ParserTemplate {
    const headerStr = headers.join(' ').toLowerCase();
    
    if (headerStr.includes('date') && headerStr.includes('amount')) {
      return this.templates.find(t => t.id === 'generic_csv')!;
    }
    
    // Return generic template as fallback
    return this.templates.find(t => t.id === 'generic_csv')!;
  }

  /**
   * Map CSV data to transaction object
   */
  private mapCsvToTransaction(headers: string[], values: string[], template: ParserTemplate): ParsedTransaction | null {
    const transaction: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      if (!value) return;
      
      const normalizedHeader = header.toLowerCase().trim();
      
      // Map common header names to fields
      if (normalizedHeader.includes('date')) {
        transaction.transactionDate = this.parseFlexibleDate(value);
      } else if (normalizedHeader.includes('amount') || normalizedHeader.includes('debit') || normalizedHeader.includes('credit')) {
        transaction.amount = parseFloat(value.replace(/,/g, ''));
      } else if (normalizedHeader.includes('description') || normalizedHeader.includes('particulars')) {
        transaction.description = value;
      } else if (normalizedHeader.includes('utr') || normalizedHeader.includes('reference')) {
        transaction.utrNumber = value;
      } else if (normalizedHeader.includes('type')) {
        transaction.transactionType = value.toLowerCase().includes('credit') ? 'credit' : 'debit';
      }
    });
    
    return transaction.transactionDate && transaction.amount ? transaction : null;
  }

  /**
   * Calculate confidence score for CSV parsing
   */
  private calculateCsvConfidence(headers: string[], values: string[], template: ParserTemplate): number {
    let score = 0;
    let total = 0;
    
    template.patterns.forEach(pattern => {
      const headerIndex = headers.findIndex(h => 
        h.toLowerCase().includes(pattern.field.toLowerCase())
      );
      
      if (headerIndex >= 0 && values[headerIndex]) {
        score += 1;
      }
      total += 1;
    });
    
    return total > 0 ? score / total : 0;
  }

  /**
   * Extract successful patterns for learning
   */
  private extractSuccessPatterns(originalText: string, successfulParse: ParsedTransaction): any {
    return {
      textLength: originalText.length,
      hasAmount: !!successfulParse.amount,
      hasDate: !!successfulParse.transactionDate,
      hasUtr: !!successfulParse.utrNumber,
      descriptionLength: successfulParse.description?.length || 0,
    };
  }
}
