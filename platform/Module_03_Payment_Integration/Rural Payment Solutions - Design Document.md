# Rural Payment Solutions - Design Document

## 1. Overview

The Rural Payment Solutions component will address the unique challenges faced by SMEs operating in rural and semi-urban areas of India. It will provide robust payment collection and processing capabilities that work effectively in environments with limited connectivity, lower digital literacy, and diverse payment preferences. This module will help bridge the digital divide and enable SMEs to efficiently serve the vast rural market that comprises over 65% of India's population.

## 2. Architecture

### 2.1 High-Level Architecture

The Rural Payment Solutions system will follow a layered architecture:

1. **Connectivity Layer**
   - Offline transaction processor
   - Low-bandwidth optimizers
   - Connection quality detector
   - Sync manager

2. **Device Compatibility Layer**
   - Feature phone interface
   - USSD service connector
   - SMS payment processor
   - Voice interface connector

3. **Payment Method Layer**
   - Cash digitization service
   - Assisted payment processor
   - Agent network manager
   - Alternative payment handler

4. **Integration Layer**
   - Core payment connector
   - Fraud detection adapter
   - Analytics integration service
   - Notification dispatcher

### 2.2 Integration Points

The Rural Payment Solutions module will integrate with:

- **Payment Module**: For core payment processing
- **Advanced Fraud Detection**: For rural-specific fraud prevention
- **Analytics Module**: For rural payment insights
- **Voice Module**: For voice-assisted payments
- **Notification Module**: For multi-channel alerts

## 3. Database Schema

### 3.1 Core Entities

#### OfflineTransaction
```typescript
@Entity()
export class OfflineTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column({ nullable: true })
  customerId: string;

  @Column({ nullable: true })
  invoiceId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column()
  paymentMethod: string;

  @Column({ type: 'jsonb', nullable: true })
  paymentDetails: Record<string, any>;

  @Column()
  status: 'pending_sync' | 'synced' | 'failed_sync' | 'conflict';

  @Column({ type: 'jsonb', nullable: true })
  metaData: Record<string, any>;

  @Column({ type: 'timestamp' })
  transactionDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  syncedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column()
  deviceId: string;

  @Column({ nullable: true })
  agentId: string;

  @Column({ nullable: true })
  syncConflictResolution: string;
}
```

#### PaymentAgent
```typescript
@Entity()
export class PaymentAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  district: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  pincode: string;

  @Column({ type: 'jsonb', nullable: true })
  geoLocation: {
    latitude: number;
    longitude: number;
  };

  @Column({ type: 'jsonb' })
  identificationDetails: {
    type: string;
    number: string;
    verificationStatus: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };

  @Column({ default: 'active' })
  status: 'pending' | 'active' | 'suspended' | 'inactive';

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalCollected: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalCommission: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

#### AgentTransaction
```typescript
@Entity()
export class AgentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  agentId: string;

  @Column({ nullable: true })
  customerId: string;

  @Column({ nullable: true })
  invoiceId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column()
  paymentMethod: string;

  @Column()
  transactionType: 'collection' | 'commission_payout' | 'refund';

  @Column()
  status: 'pending' | 'completed' | 'failed' | 'disputed';

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  commissionAmount: number;

  @Column({ type: 'jsonb', nullable: true })
  locationData: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  verificationData: Record<string, any>;

  @Column({ type: 'timestamp' })
  transactionDate: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

#### RuralPaymentMethod
```typescript
@Entity()
export class RuralPaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  type: 'cash' | 'agent' | 'ussd' | 'sms' | 'feature_phone' | 'qr' | 'card' | 'upi' | 'other';

  @Column({ default: true })
  isOfflineCapable: boolean;

  @Column({ default: false })
  requiresAgent: boolean;

  @Column({ type: 'jsonb', nullable: true })
  processingConfig: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  verificationRequirements: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  processingFee: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

#### DeviceRegistration
```typescript
@Entity()
export class DeviceRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  agentId: string;

  @Column()
  deviceId: string;

  @Column({ nullable: true })
  deviceName: string;

  @Column({ nullable: true })
  deviceModel: string;

  @Column({ nullable: true })
  osVersion: string;

  @Column({ nullable: true })
  appVersion: string;

  @Column()
  deviceType: 'smartphone' | 'feature_phone' | 'tablet' | 'pos' | 'other';

  @Column({ default: 'active' })
  status: 'pending' | 'active' | 'suspended' | 'inactive';

  @Column({ type: 'timestamp', nullable: true })
  lastSyncTime: Date;

  @Column({ type: 'jsonb', nullable: true })
  capabilities: string[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  registeredAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

#### SyncLog
```typescript
@Entity()
export class SyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  deviceId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  agentId: string;

  @Column()
  syncType: 'full' | 'incremental' | 'transaction_only';

  @Column()
  status: 'initiated' | 'in_progress' | 'completed' | 'failed' | 'partial';

  @Column({ type: 'jsonb', nullable: true })
  syncStats: {
    transactionsSynced: number;
    dataTransferred: number;
    conflictsDetected: number;
    conflictsResolved: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  connectionInfo: {
    connectionType: string;
    signalStrength: number;
    bandwidth: number;
  };

  @Column({ type: 'text', nullable: true })
  errorDetails: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

#### USSDSession
```typescript
@Entity()
export class USSDSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  phoneNumber: string;

  @Column({ nullable: true })
  customerId: string;

  @Column({ nullable: true })
  organizationId: string;

  @Column()
  sessionState: string;

  @Column({ type: 'jsonb' })
  sessionData: Record<string, any>;

  @Column({ type: 'timestamp' })
  lastInteractionTime: Date;

  @Column({ default: 'active' })
  status: 'active' | 'completed' | 'expired' | 'failed';

  @Column({ nullable: true })
  transactionId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

#### SMSPayment
```typescript
@Entity()
export class SMSPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @Column()
  phoneNumber: string;

  @Column({ nullable: true })
  customerId: string;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ type: 'text' })
  messageContent: string;

  @Column({ type: 'jsonb', nullable: true })
  parsedData: Record<string, any>;

  @Column()
  status: 'received' | 'parsed' | 'processing' | 'completed' | 'failed' | 'invalid';

  @Column({ nullable: true })
  transactionId: string;

  @Column({ type: 'text', nullable: true })
  responseMessage: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  receivedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

## 4. Core Services

### 4.1 OfflineTransactionService

Primary service for managing offline transactions:

```typescript
@Injectable()
export class OfflineTransactionService {
  constructor(
    private offlineTransactionRepository: Repository<OfflineTransaction>,
    private paymentService: PaymentService,
    private syncLogService: SyncLogService,
    private deviceRegistrationService: DeviceRegistrationService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createOfflineTransaction(transactionData: OfflineTransactionDto): Promise<OfflineTransaction> {
    // Implementation details
  }

  async syncOfflineTransactions(deviceId: string, transactions: OfflineTransactionDto[]): Promise<SyncResultDto> {
    // Implementation details
  }

  async resolveConflict(transactionId: string, resolutionData: ConflictResolutionDto): Promise<OfflineTransaction> {
    // Implementation details
  }

  async getOfflineTransactions(organizationId: string, filters: OfflineTransactionFilterDto): Promise<OfflineTransaction[]> {
    // Implementation details
  }

  async getOfflineTransactionStatus(transactionId: string): Promise<OfflineTransaction> {
    // Implementation details
  }
}
```

### 4.2 PaymentAgentService

Service for managing payment agents:

```typescript
@Injectable()
export class PaymentAgentService {
  constructor(
    private paymentAgentRepository: Repository<PaymentAgent>,
    private agentTransactionRepository: Repository<AgentTransaction>,
    private userService: UserService,
    private verificationService: VerificationService,
  ) {}

  async registerAgent(organizationId: string, agentData: AgentRegistrationDto): Promise<PaymentAgent> {
    // Implementation details
  }

  async updateAgentStatus(agentId: string, status: string): Promise<PaymentAgent> {
    // Implementation details
  }

  async getAgentById(agentId: string): Promise<PaymentAgent> {
    // Implementation details
  }

  async getOrganizationAgents(organizationId: string, filters?: AgentFilterDto): Promise<PaymentAgent[]> {
    // Implementation details
  }

  async recordAgentTransaction(transactionData: AgentTransactionDto): Promise<AgentTransaction> {
    // Implementation details
  }

  async calculateAgentCommission(agentId: string, period: DateRangeDto): Promise<CommissionSummaryDto> {
    // Implementation details
  }

  async processAgentPayout(payoutData: AgentPayoutDto): Promise<AgentTransaction> {
    // Implementation details
  }
}
```

### 4.3 RuralPaymentMethodService

Service for managing rural payment methods:

```typescript
@Injectable()
export class RuralPaymentMethodService {
  constructor(
    private ruralPaymentMethodRepository: Repository<RuralPaymentMethod>,
    private paymentService: PaymentService,
    private agentService: PaymentAgentService,
  ) {}

  async createPaymentMethod(organizationId: string, methodData: RuralPaymentMethodDto): Promise<RuralPaymentMethod> {
    // Implementation details
  }

  async updatePaymentMethod(methodId: string, methodData: RuralPaymentMethodUpdateDto): Promise<RuralPaymentMethod> {
    // Implementation details
  }

  async getPaymentMethod(methodId: string): Promise<RuralPaymentMethod> {
    // Implementation details
  }

  async getOrganizationPaymentMethods(organizationId: string, includeInactive: boolean = false): Promise<RuralPaymentMethod[]> {
    // Implementation details
  }

  async processRuralPayment(paymentData: RuralPaymentProcessDto): Promise<PaymentResultDto> {
    // Implementation details
  }

  async validatePaymentMethod(methodId: string, amount: number): Promise<ValidationResultDto> {
    // Implementation details
  }
}
```

### 4.4 DeviceManagementService

Service for managing device registrations and capabilities:

```typescript
@Injectable()
export class DeviceManagementService {
  constructor(
    private deviceRegistrationRepository: Repository<DeviceRegistration>,
    private syncLogRepository: Repository<SyncLog>,
    private userService: UserService,
    private agentService: PaymentAgentService,
  ) {}

  async registerDevice(registrationData: DeviceRegistrationDto): Promise<DeviceRegistration> {
    // Implementation details
  }

  async updateDeviceStatus(deviceId: string, status: string): Promise<DeviceRegistration> {
    // Implementation details
  }

  async getDeviceById(deviceId: string): Promise<DeviceRegistration> {
    // Implementation details
  }

  async getOrganizationDevices(organizationId: string, filters?: DeviceFilterDto): Promise<DeviceRegistration[]> {
    // Implementation details
  }

  async recordSyncAttempt(syncData: SyncLogDto): Promise<SyncLog> {
    // Implementation details
  }

  async getSyncHistory(deviceId: string, limit: number = 10): Promise<SyncLog[]> {
    // Implementation details
  }

  async getDeviceCapabilities(deviceId: string): Promise<string[]> {
    // Implementation details
  }
}
```

### 4.5 USSDPaymentService

Service for handling USSD-based payments:

```typescript
@Injectable()
export class USSDPaymentService {
  constructor(
    private ussdSessionRepository: Repository<USSDSession>,
    private customerService: CustomerService,
    private invoiceService: InvoiceService,
    private paymentService: PaymentService,
    private smsService: SMSService,
  ) {}

  async handleUSSDRequest(requestData: USSDRequestDto): Promise<USSDResponseDto> {
    // Implementation details
  }

  async processUSSDPayment(sessionId: string, paymentData: USSDPaymentDto): Promise<PaymentResultDto> {
    // Implementation details
  }

  async getActiveSession(sessionId: string): Promise<USSDSession> {
    // Implementation details
  }

  async updateSessionState(sessionId: string, state: string, data: Record<string, any>): Promise<USSDSession> {
    // Implementation details
  }

  async expireInactiveSessions(): Promise<number> {
    // Implementation details
  }
}
```

### 4.6 SMSPaymentService

Service for handling SMS-based payments:

```typescript
@Injectable()
export class SMSPaymentService {
  constructor(
    private smsPaymentRepository: Repository<SMSPayment>,
    private customerService: CustomerService,
    private invoiceService: InvoiceService,
    private paymentService: PaymentService,
    private smsService: SMSService,
  ) {}

  async processSMSPayment(messageData: SMSMessageDto): Promise<SMSPayment> {
    // Implementation details
  }

  async parsePaymentMessage(messageContent: string): Promise<ParsedSMSDto> {
    // Implementation details
  }

  async sendPaymentConfirmation(phoneNumber: string, transactionId: string, amount: number): Promise<void> {
    // Implementation details
  }

  async getSMSPaymentHistory(phoneNumber: string, limit: number = 10): Promise<SMSPayment[]> {
    // Implementation details
  }

  async resendPaymentResponse(smsPaymentId: string): Promise<SMSPayment> {
    // Implementation details
  }
}
```

### 4.7 SyncManagerService

Service for managing data synchronization:

```typescript
@Injectable()
export class SyncManagerService {
  constructor(
    private offlineTransactionService: OfflineTransactionService,
    private deviceManagementService: DeviceManagementService,
    private syncLogRepository: Repository<SyncLog>,
    private dataCompressionService: DataCompressionService,
    private conflictResolutionService: ConflictResolutionService,
  ) {}

  async initiateSync(deviceId: string, syncType: string): Promise<SyncInitiationDto> {
    // Implementation details
  }

  async processSyncData(deviceId: string, syncData: SyncDataDto): Promise<SyncResultDto> {
    // Implementation details
  }

  async optimizeSyncForBandwidth(deviceId: string, connectionInfo: ConnectionInfoDto): Promise<SyncOptimizationDto> {
    // Implementation details
  }

  async handleSyncConflicts(conflicts: SyncConflictDto[]): Promise<ConflictResolutionResultDto> {
    // Implementation details
  }

  async getSyncStatus(syncId: string): Promise<SyncLog> {
    // Implementation details
  }
}
```

## 5. API Endpoints

### 5.1 OfflineTransactionController

```typescript
@Controller('api/rural-payments/offline-transactions')
@UseGuards(JwtAuthGuard)
export class OfflineTransactionController {
  constructor(
    private offlineTransactionService: OfflineTransactionService,
  ) {}

  @Post()
  async createOfflineTransaction(
    @Body() transactionData: OfflineTransactionDto,
    @CurrentUser() user: UserDto,
  ): Promise<OfflineTransaction> {
    // Implementation details
  }

  @Post('sync')
  async syncOfflineTransactions(
    @Body() syncData: { deviceId: string; transactions: OfflineTransactionDto[] },
    @CurrentUser() user: UserDto,
  ): Promise<SyncResultDto> {
    // Implementation details
  }

  @Post(':transactionId/resolve-conflict')
  async resolveConflict(
    @Param('transactionId') transactionId: string,
    @Body() resolutionData: ConflictResolutionDto,
    @CurrentUser() user: UserDto,
  ): Promise<OfflineTransaction> {
    // Implementation details
  }

  @Get('organization/:organizationId')
  async getOfflineTransactions(
    @Param('organizationId') organizationId: string,
    @Query() filters: OfflineTransactionFilterDto,
    @CurrentUser() user: UserDto,
  ): Promise<OfflineTransaction[]> {
    // Implementation details
  }

  @Get(':transactionId')
  async getOfflineTransactionStatus(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: UserDto,
  ): Promise<OfflineTransaction> {
    // Implementation details
  }
}
```

### 5.2 PaymentAgentController

```typescript
@Controller('api/rural-payments/agents')
@UseGuards(JwtAuthGuard)
export class PaymentAgentController {
  constructor(
    private paymentAgentService: PaymentAgentService,
  ) {}

  @Post()
  async registerAgent(
    @Body() agentData: AgentRegistrationDto,
    @CurrentUser() user: UserDto,
  ): Promise<PaymentAgent> {
    // Implementation details
  }

  @Put(':agentId/status')
  async updateAgentStatus(
    @Param('agentId') agentId: string,
    @Body() data: { status: string },
    @CurrentUser() user: UserDto,
  ): Promise<PaymentAgent> {
    // Implementation details
  }

  @Get(':agentId')
  async getAgentById(
    @Param('agentId') agentId: string,
    @CurrentUser() user: UserDto,
  ): Promise<PaymentAgent> {
    // Implementation details
  }

  @Get('organization/:organizationId')
  async getOrganizationAgents(
    @Param('organizationId') organizationId: string,
    @Query() filters: AgentFilterDto,
    @CurrentUser() user: UserDto,
  ): Promise<PaymentAgent[]> {
    // Implementation details
  }

  @Post('transactions')
  async recordAgentTransaction(
    @Body() transactionData: AgentTransactionDto,
    @CurrentUser() user: UserDto,
  ): Promise<AgentTransaction> {
    // Implementation details
  }

  @Get(':agentId/commission')
  async calculateAgentCommission(
    @Param('agentId') agentId: string,
    @Query() period: DateRangeDto,
    @CurrentUser() user: UserDto,
  ): Promise<CommissionSummaryDto> {
    // Implementation details
  }

  @Post(':agentId/payout')
  async processAgentPayout(
    @Param('agentId') agentId: string,
    @Body() payoutData: AgentPayoutDto,
    @CurrentUser() user: UserDto,
  ): Promise<AgentTransaction> {
    // Implementation details
  }
}
```

### 5.3 RuralPaymentMethodController

```typescript
@Controller('api/rural-payments/methods')
@UseGuards(JwtAuthGuard)
export class RuralPaymentMethodController {
  constructor(
    private ruralPaymentMethodService: RuralPaymentMethodService,
  ) {}

  @Post()
  async createPaymentMethod(
    @Body() methodData: RuralPaymentMethodDto,
    @CurrentUser() user: UserDto,
  ): Promise<RuralPaymentMethod> {
    // Implementation details
  }

  @Put(':methodId')
  async updatePaymentMethod(
    @Param('methodId') methodId: string,
    @Body() methodData: RuralPaymentMethodUpdateDto,
    @CurrentUser() user: UserDto,
  ): Promise<RuralPaymentMethod> {
    // Implementation details
  }

  @Get(':methodId')
  async getPaymentMethod(
    @Param('methodId') methodId: string,
    @CurrentUser() user: UserDto,
  ): Promise<RuralPaymentMethod> {
    // Implementation details
  }

  @Get('organization/:organizationId')
  async getOrganizationPaymentMethods(
    @Param('organizationId') organizationId: string,
    @Query('includeInactive') includeInactive: boolean,
    @CurrentUser() user: UserDto,
  ): Promise<RuralPaymentMethod[]> {
    // Implementation details
  }

  @Post('process')
  async processRuralPayment(
    @Body() paymentData: RuralPaymentProcessDto,
    @CurrentUser() user: UserDto,
  ): Promise<PaymentResultDto> {
    // Implementation details
  }

  @Post(':methodId/validate')
  async validatePaymentMethod(
    @Param('methodId') methodId: string,
    @Body() data: { amount: number },
    @CurrentUser() user: UserDto,
  ): Promise<ValidationResultDto> {
    // Implementation details
  }
}
```

### 5.4 DeviceManagementController

```typescript
@Controller('api/rural-payments/devices')
@UseGuards(JwtAuthGuard)
export class DeviceManagementController {
  constructor(
    private deviceManagementService: DeviceManagementService,
  ) {}

  @Post('register')
  async registerDevice(
    @Body() registrationData: DeviceRegistrationDto,
    @CurrentUser() user: UserDto,
  ): Promise<DeviceRegistration> {
    // Implementation details
  }

  @Put(':deviceId/status')
  async updateDeviceStatus(
    @Param('deviceId') deviceId: string,
    @Body() data: { status: string },
    @CurrentUser() user: UserDto,
  ): Promise<DeviceRegistration> {
    // Implementation details
  }

  @Get(':deviceId')
  async getDeviceById(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: UserDto,
  ): Promise<DeviceRegistration> {
    // Implementation details
  }

  @Get('organization/:organizationId')
  async getOrganizationDevices(
    @Param('organizationId') organizationId: string,
    @Query() filters: DeviceFilterDto,
    @CurrentUser() user: UserDto,
  ): Promise<DeviceRegistration[]> {
    // Implementation details
  }

  @Post('sync/log')
  async recordSyncAttempt(
    @Body() syncData: SyncLogDto,
    @CurrentUser() user: UserDto,
  ): Promise<SyncLog> {
    // Implementation details
  }

  @Get(':deviceId/sync-history')
  async getSyncHistory(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit: number,
    @CurrentUser() user: UserDto,
  ): Promise<SyncLog[]> {
    // Implementation details
  }

  @Get(':deviceId/capabilities')
  async getDeviceCapabilities(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: UserDto,
  ): Promise<string[]> {
    // Implementation details
  }
}
```

### 5.5 USSDPaymentController

```typescript
@Controller('api/rural-payments/ussd')
export class USSDPaymentController {
  constructor(
    private ussdPaymentService: USSDPaymentService,
  ) {}

  @Post('request')
  async handleUSSDRequest(
    @Body() requestData: USSDRequestDto,
  ): Promise<USSDResponseDto> {
    // Implementation details
  }

  @Post('payment')
  async processUSSDPayment(
    @Body() paymentData: { sessionId: string; paymentData: USSDPaymentDto },
  ): Promise<PaymentResultDto> {
    // Implementation details
  }

  @Get('session/:sessionId')
  @UseGuards(JwtAuthGuard)
  async getActiveSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: UserDto,
  ): Promise<USSDSession> {
    // Implementation details
  }

  @Post('session/:sessionId/update')
  @UseGuards(JwtAuthGuard)
  async updateSessionState(
    @Param('sessionId') sessionId: string,
    @Body() data: { state: string; data: Record<string, any> },
    @CurrentUser() user: UserDto,
  ): Promise<USSDSession> {
    // Implementation details
  }

  @Post('expire-sessions')
  @UseGuards(JwtAuthGuard)
  async expireInactiveSessions(
    @CurrentUser() user: UserDto,
  ): Promise<{ expiredCount: number }> {
    // Implementation details
  }
}
```

### 5.6 SMSPaymentController

```typescript
@Controller('api/rural-payments/sms')
export class SMSPaymentController {
  constructor(
    private smsPaymentService: SMSPaymentService,
  ) {}

  @Post('incoming')
  async processSMSPayment(
    @Body() messageData: SMSMessageDto,
  ): Promise<SMSPayment> {
    // Implementation details
  }

  @Post('parse')
  @UseGuards(JwtAuthGuard)
  async parsePaymentMessage(
    @Body() data: { messageContent: string },
    @CurrentUser() user: UserDto,
  ): Promise<ParsedSMSDto> {
    // Implementation details
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  async sendPaymentConfirmation(
    @Body() data: { phoneNumber: string; transactionId: string; amount: number },
    @CurrentUser() user: UserDto,
  ): Promise<void> {
    // Implementation details
  }

  @Get('history/:phoneNumber')
  @UseGuards(JwtAuthGuard)
  async getSMSPaymentHistory(
    @Param('phoneNumber') phoneNumber: string,
    @Query('limit') limit: number,
    @CurrentUser() user: UserDto,
  ): Promise<SMSPayment[]> {
    // Implementation details
  }

  @Post(':smsPaymentId/resend')
  @UseGuards(JwtAuthGuard)
  async resendPaymentResponse(
    @Param('smsPaymentId') smsPaymentId: string,
    @CurrentUser() user: UserDto,
  ): Promise<SMSPayment> {
    // Implementation details
  }
}
```

### 5.7 SyncController

```typescript
@Controller('api/rural-payments/sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(
    private syncManagerService: SyncManagerService,
  ) {}

  @Post('initiate')
  async initiateSync(
    @Body() data: { deviceId: string; syncType: string },
    @CurrentUser() user: UserDto,
  ): Promise<SyncInitiationDto> {
    // Implementation details
  }

  @Post('process')
  async processSyncData(
    @Body() data: { deviceId: string; syncData: SyncDataDto },
    @CurrentUser() user: UserDto,
  ): Promise<SyncResultDto> {
    // Implementation details
  }

  @Post('optimize')
  async optimizeSyncForBandwidth(
    @Body() data: { deviceId: string; connectionInfo: ConnectionInfoDto },
    @CurrentUser() user: UserDto,
  ): Promise<SyncOptimizationDto> {
    // Implementation details
  }

  @Post('conflicts')
  async handleSyncConflicts(
    @Body() conflicts: SyncConflictDto[],
    @CurrentUser() user: UserDto,
  ): Promise<ConflictResolutionResultDto> {
    // Implementation details
  }

  @Get(':syncId/status')
  async getSyncStatus(
    @Param('syncId') syncId: string,
    @CurrentUser() user: UserDto,
  ): Promise<SyncLog> {
    // Implementation details
  }
}
```

## 6. Offline Capabilities

### 6.1 Offline Transaction Processing

1. **Local Storage Architecture**
   - IndexedDB for web applications
   - SQLite for mobile applications
   - Secure storage for transaction data
   - Data encryption for sensitive information

2. **Transaction Queuing**
   - Priority-based transaction queue
   - Retry mechanisms with exponential backoff
   - Transaction expiration policies
   - Queue management interface

3. **Conflict Resolution**
   - Timestamp-based conflict detection
   - Server-side validation rules
   - Conflict resolution strategies
   - Manual resolution interface for complex conflicts

4. **Data Synchronization**
   - Incremental sync to minimize data transfer
   - Delta-based updates
   - Bandwidth-aware synchronization
   - Background synchronization

### 6.2 Connectivity Management

1. **Connection Detection**
   - Real-time connectivity monitoring
   - Signal strength assessment
   - Connection quality evaluation
   - Bandwidth estimation

2. **Low-Bandwidth Optimization**
   - Data compression techniques
   - Minimal payload design
   - Prioritized data transfer
   - Chunked synchronization

3. **Intermittent Connectivity Handling**
   - Automatic retry mechanisms
   - Session resumption
   - Partial data transfer support
   - Checkpoint-based synchronization

4. **Offline-First Design**
   - Complete offline functionality
   - Graceful degradation of features
   - Offline receipt generation
   - Local validation rules

## 7. Feature Phone and USSD Support

### 7.1 USSD Interface

1. **USSD Menu Structure**
   - Simple, intuitive menu hierarchy
   - Minimal input requirements
   - Clear instructions and feedback
   - Error handling and recovery

2. **USSD Session Management**
   - Session timeout handling
   - Context preservation
   - State management
   - Session recovery

3. **USSD Payment Flow**
   - Customer identification
   - Invoice selection
   - Amount confirmation
   - Payment method selection
   - PIN/OTP verification
   - Receipt generation

4. **USSD Integration**
   - Telecom operator integration
   - USSD gateway connectivity
   - Shortcode management
   - Multi-operator support

### 7.2 SMS Payment Processing

1. **SMS Format Parsing**
   - Structured message format
   - Natural language processing for unstructured messages
   - Error correction algorithms
   - Multi-language support

2. **SMS Command Set**
   - Payment initiation commands
   - Balance inquiry commands
   - Invoice request commands
   - Help and information commands

3. **SMS Response Handling**
   - Confirmation messages
   - Error notifications
   - Receipt generation
   - Follow-up instructions

4. **SMS Security**
   - Phone number verification
   - Transaction limits
   - OTP verification for high-value transactions
   - Suspicious activity detection

### 7.3 Feature Phone Applications

1. **Java ME Applications**
   - Lightweight application design
   - Minimal resource requirements
   - Offline functionality
   - Simple user interface

2. **SIM Application Toolkit**
   - SIM-based application deployment
   - Carrier integration
   - Secure element utilization
   - Cross-device compatibility

3. **IVR Integration**
   - Voice-guided payment process
   - DTMF input handling
   - Call-back verification
   - Voice receipt options

4. **Hybrid Approaches**
   - Combined SMS/USSD workflows
   - Progressive enhancement based on device capabilities
   - Fallback mechanisms
   - Cross-channel session continuity

## 8. Agent Network Management

### 8.1 Agent Onboarding

1. **Registration Process**
   - Digital application form
   - Identity verification
   - Background checks
   - Training module assignment
   - Documentation collection

2. **Agent Verification**
   - KYC verification
   - Bank account verification
   - Address verification
   - Reference checks
   - Regulatory compliance checks

3. **Equipment Provisioning**
   - Mobile device requirements
   - POS terminal options
   - Biometric device integration
   - Printer options for receipts

4. **Training and Certification**
   - Digital training modules
   - Knowledge assessment
   - Certification process
   - Periodic recertification

### 8.2 Agent Operations

1. **Transaction Processing**
   - Cash collection workflow
   - Digital receipt generation
   - Customer verification
   - Transaction limits management
   - Dispute handling procedures

2. **Commission Management**
   - Dynamic commission structure
   - Real-time commission calculation
   - Commission disbursement options
   - Performance-based incentives

3. **Liquidity Management**
   - Float balance monitoring
   - Cash-in/cash-out tracking
   - Rebalancing alerts
   - Float replenishment process

4. **Performance Monitoring**
   - Transaction volume tracking
   - Success rate monitoring
   - Customer satisfaction metrics
   - Compliance adherence

### 8.3 Agent Security

1. **Authentication Mechanisms**
   - Multi-factor authentication
   - Biometric verification options
   - Session management
   - Device binding

2. **Transaction Limits**
   - Daily/weekly/monthly limits
   - Transaction type limits
   - Approval workflows for exceptions
   - Risk-based limit adjustment

3. **Fraud Prevention**
   - Unusual activity detection
   - Location verification
   - Transaction pattern monitoring
   - Real-time alerts

4. **Dispute Resolution**
   - Customer complaint handling
   - Transaction investigation process
   - Evidence collection
   - Resolution tracking

## 9. Cash Digitization

### 9.1 Cash Collection Process

1. **Cash Acceptance Workflow**
   - Amount verification
   - Counterfeit detection guidance
   - Denomination recording
   - Receipt generation

2. **Digital Conversion**
   - Real-time account crediting
   - Transaction recording
   - Payment allocation to invoices
   - Reconciliation with physical cash

3. **Cash Handling Security**
   - Physical security guidelines
   - Cash storage recommendations
   - Deposit scheduling
   - Insurance options

4. **Reconciliation Process**
   - End-of-day balancing
   - Discrepancy handling
   - Audit trail generation
   - Exception reporting

### 9.2 Cash-to-Digital Bridges

1. **Bank Deposit Integration**
   - Bank branch network integration
   - Deposit slip generation
   - Automated reconciliation
   - Real-time notification

2. **Retail Network Utilization**
   - Retail outlet partnerships
   - Barcode/QR code payment slips
   - Commission structure
   - Service level agreements

3. **Mobile Money Integration**
   - Mobile money wallet integration
   - Cross-platform support
   - API connectivity
   - Fee structure management

4. **Microfinance Institution Partnerships**
   - MFI network leverage
   - Shared agent arrangements
   - Rural outreach expansion
   - Joint service offerings

## 10. Regulatory Compliance

### 10.1 RBI Guidelines Compliance

1. **Payment System Regulations**
   - Payment aggregator compliance
   - Payment gateway requirements
   - Transaction limits adherence
   - Reporting requirements

2. **KYC/AML Compliance**
   - Customer identification procedures
   - Transaction monitoring
   - Suspicious activity reporting
   - Record keeping requirements

3. **Agent Banking Regulations**
   - Business correspondent guidelines
   - Cash handling limits
   - Documentation requirements
   - Training and certification

4. **Data Localization**
   - Data storage requirements
   - Cross-border data transfer restrictions
   - Encryption standards
   - Audit requirements

### 10.2 Financial Inclusion Mandates

1. **Priority Sector Lending**
   - PSL reporting integration
   - Rural service metrics
   - Agricultural lending support
   - MSME financing facilitation

2. **Jan Dhan Compatibility**
   - PMJDY account integration
   - Zero-balance account support
   - Direct benefit transfer handling
   - Financial literacy components

3. **Digital India Alignment**
   - Digital payment promotion
   - Cashless transaction incentives
   - Digital receipt generation
   - Aadhaar integration options

4. **Rural Banking Requirements**
   - Unbanked area service metrics
   - Rural branch equivalent services
   - Lead bank scheme alignment
   - Regional rural bank integration

## 11. Security Considerations

- End-to-end encryption for all transactions
- Secure offline data storage with encryption
- Multi-factor authentication for agents
- Transaction signing for integrity
- Secure SMS and USSD channel implementation
- Compliance with RBI security guidelines
- Regular security audits and penetration testing
- Fraud monitoring for rural-specific patterns

## 12. Performance Requirements

- Sub-second transaction processing in online mode
- Efficient operation on low-end devices
- Minimal data usage for synchronization
- Optimized battery consumption for field operations
- Fast synchronization after connectivity restoration
- Responsive operation in low-bandwidth environments

## 13. Implementation Phases

### Phase 1: Core Offline Capabilities
- Offline transaction processing
- Basic synchronization
- Simple agent management
- Essential security features

### Phase 2: Feature Phone Support
- USSD interface implementation
- SMS payment processing
- Feature phone applications
- Voice payment integration

### Phase 3: Agent Network Expansion
- Advanced agent management
- Commission system
- Performance monitoring
- Training modules

### Phase 4: Cash Digitization
- Cash collection workflows
- Reconciliation systems
- Banking integration
- Retail network partnerships

## 14. Testing Strategy

### Unit Testing
- Test offline transaction processing
- Validate synchronization algorithms
- Test USSD/SMS parsing logic
- Verify agent commission calculations

### Integration Testing
- Test end-to-end payment flows
- Verify telecom operator integration
- Test banking system connectivity
- Validate cross-platform compatibility

### Field Testing
- Real-world testing in rural environments
- Connectivity stress testing
- Agent usability testing
- Cash handling workflow validation

### Compliance Testing
- Verify regulatory requirement implementation
- Test security measures
- Validate data protection mechanisms
- Audit trail verification

## 15. Monitoring and Maintenance

- Agent performance monitoring
- Offline transaction success rate tracking
- Synchronization efficiency metrics
- Device health monitoring
- Regulatory change monitoring and implementation
