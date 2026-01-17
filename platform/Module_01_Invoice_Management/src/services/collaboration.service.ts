import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../invoice.entity';
import { MetricsService } from './metrics.service';

export interface CollaborationSession {
  sessionId: string;
  invoiceId: string;
  tenantId: string;
  participants: Participant[];
  createdAt: Date;
  lastActivity: Date;
  status: 'active' | 'paused' | 'ended';
  permissions: SessionPermissions;
}

export interface Participant {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  lastSeen: Date;
  isActive: boolean;
  cursor?: CursorPosition;
  permissions: UserPermissions;
}

export interface CursorPosition {
  line: number;
  column: number;
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface SessionPermissions {
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canApprove: boolean;
  canExport: boolean;
}

export interface UserPermissions {
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canApprove: boolean;
  canExport: boolean;
}

export interface CollaborationEvent {
  eventId: string;
  sessionId: string;
  userId: string;
  type: 'join' | 'leave' | 'edit' | 'comment' | 'cursor' | 'selection' | 'save';
  timestamp: Date;
  data: any;
}

export interface Comment {
  commentId: string;
  invoiceId: string;
  userId: string;
  userName: string;
  content: string;
  position?: {
    line: number;
    column: number;
    selection?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  };
  createdAt: Date;
  updatedAt: Date;
  replies: Comment[];
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface Version {
  versionId: string;
  invoiceId: string;
  versionNumber: number;
  content: any;
  changes: Change[];
  createdBy: string;
  createdAt: Date;
  description: string;
  isAutoSave: boolean;
}

export interface Change {
  type: 'insert' | 'delete' | 'replace';
  position: { line: number; column: number };
  content: string;
  userId: string;
  timestamp: Date;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  events: ('join' | 'leave' | 'edit' | 'comment' | 'save' | 'mention')[];
}

export interface CollaborationStats {
  totalSessions: number;
  activeUsers: number;
  averageSessionDuration: number;
  editsPerSession: number;
  commentsPerSession: number;
  collaborationScore: number;
}

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);
  private readonly activeSessions = new Map<string, CollaborationSession>();
  private readonly sessionEvents = new Map<string, CollaborationEvent[]>();
  private readonly invoiceComments = new Map<string, Comment[]>();
  private readonly invoiceVersions = new Map<string, Version[]>();
  private readonly userNotifications = new Map<string, NotificationSettings>();

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Create a new collaboration session
   */
  async createSession(
    invoiceId: string,
    tenantId: string,
    ownerId: string,
    ownerInfo: { name: string; email: string },
  ): Promise<CollaborationSession> {
    this.logger.log(`Creating collaboration session for invoice ${invoiceId}`);

    // Verify invoice exists and user has access
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, tenant_id: tenantId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found or access denied`);
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: CollaborationSession = {
      sessionId,
      invoiceId,
      tenantId,
      participants: [{
        userId: ownerId,
        name: ownerInfo.name,
        email: ownerInfo.email,
        role: 'owner',
        joinedAt: new Date(),
        lastSeen: new Date(),
        isActive: true,
        permissions: {
          canEdit: true,
          canComment: true,
          canShare: true,
          canApprove: true,
          canExport: true,
        },
      }],
      createdAt: new Date(),
      lastActivity: new Date(),
      status: 'active',
      permissions: {
        canEdit: true,
        canComment: true,
        canShare: true,
        canApprove: true,
        canExport: true,
      },
    };

    this.activeSessions.set(sessionId, session);
    this.sessionEvents.set(sessionId, []);

    // Track event
    await this.trackEvent(sessionId, ownerId, 'join', { role: 'owner' });

    // Record metrics
    this.metricsService.recordCollaborationSessionCreated(sessionId);

    return session;
  }

  /**
   * Join an existing collaboration session
   */
  async joinSession(
    sessionId: string,
    userId: string,
    userInfo: { name: string; email: string },
    role: 'editor' | 'viewer' = 'editor',
  ): Promise<CollaborationSession> {
    this.logger.log(`User ${userId} joining session ${sessionId}`);

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check if user is already a participant
    const existingParticipant = session.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      existingParticipant.isActive = true;
      existingParticipant.lastSeen = new Date();
      return session;
    }

    // Add new participant
    const participant: Participant = {
      userId,
      name: userInfo.name,
      email: userInfo.email,
      role,
      joinedAt: new Date(),
      lastSeen: new Date(),
      isActive: true,
      permissions: this.getDefaultPermissions(role),
    };

    session.participants.push(participant);
    session.lastActivity = new Date();

    // Track event
    await this.trackEvent(sessionId, userId, 'join', { role });

    // Notify other participants
    await this.notifyParticipants(sessionId, 'join', {
      userId,
      name: userInfo.name,
      role,
    }, userId);

    return session;
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    this.logger.log(`User ${userId} leaving session ${sessionId}`);

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.isActive = false;
      participant.lastSeen = new Date();
    }

    session.lastActivity = new Date();

    // Track event
    await this.trackEvent(sessionId, userId, 'leave');

    // Notify other participants
    await this.notifyParticipants(sessionId, 'leave', { userId }, userId);

    // Check if session should be ended
    const activeParticipants = session.participants.filter(p => p.isActive);
    if (activeParticipants.length === 0) {
      await this.endSession(sessionId);
    }
  }

  /**
   * Update cursor position
   */
  async updateCursor(
    sessionId: string,
    userId: string,
    cursor: CursorPosition,
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.cursor = cursor;
      participant.lastSeen = new Date();
    }

    session.lastActivity = new Date();

    // Track event
    await this.trackEvent(sessionId, userId, 'cursor', { cursor });

    // Broadcast cursor position to other participants
    await this.broadcastCursor(sessionId, userId, cursor);
  }

  /**
   * Add a comment to the invoice
   */
  async addComment(
    invoiceId: string,
    userId: string,
    userName: string,
    content: string,
    position?: any,
  ): Promise<Comment> {
    this.logger.log(`Adding comment to invoice ${invoiceId} by user ${userId}`);

    const comment: Comment = {
      commentId: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceId,
      userId,
      userName,
      content,
      position,
      createdAt: new Date(),
      updatedAt: new Date(),
      replies: [],
      resolved: false,
    };

    if (!this.invoiceComments.has(invoiceId)) {
      this.invoiceComments.set(invoiceId, []);
    }

    this.invoiceComments.get(invoiceId)!.push(comment);

    // Find active sessions for this invoice
    const activeSessions = Array.from(this.activeSessions.values())
      .filter(session => session.invoiceId === invoiceId && session.status === 'active');

    // Notify participants in all active sessions
    for (const session of activeSessions) {
      await this.trackEvent(session.sessionId, userId, 'comment', { comment });
      await this.notifyParticipants(session.sessionId, 'comment', { comment }, userId);
    }

    // Record metrics
    this.metricsService.recordCommentAdded(invoiceId);

    return comment;
  }

  /**
   * Reply to a comment
   */
  async replyToComment(
    commentId: string,
    userId: string,
    userName: string,
    content: string,
  ): Promise<Comment> {
    // Find the parent comment
    let parentComment: Comment | undefined;
    
    for (const comments of this.invoiceComments.values()) {
      parentComment = comments.find(c => c.commentId === commentId);
      if (parentComment) break;
    }

    if (!parentComment) {
      throw new Error(`Comment ${commentId} not found`);
    }

    const reply: Comment = {
      commentId: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceId: parentComment.invoiceId,
      userId,
      userName,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      replies: [],
      resolved: false,
    };

    parentComment.replies.push(reply);
    parentComment.updatedAt = new Date();

    // Notify participants
    const activeSessions = Array.from(this.activeSessions.values())
      .filter(session => session.invoiceId === parentComment.invoiceId && session.status === 'active');

    for (const session of activeSessions) {
      await this.notifyParticipants(session.sessionId, 'comment', { 
        type: 'reply',
        parentCommentId: commentId,
        reply 
      }, userId);
    }

    return reply;
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string, userId: string): Promise<void> {
    // Find the comment
    let comment: Comment | undefined;
    
    for (const comments of this.invoiceComments.values()) {
      comment = comments.find(c => c.commentId === commentId);
      if (comment) break;
    }

    if (!comment) {
      throw new Error(`Comment ${commentId} not found`);
    }

    comment.resolved = true;
    comment.resolvedBy = userId;
    comment.resolvedAt = new Date();

    // Notify participants
    const activeSessions = Array.from(this.activeSessions.values())
      .filter(session => session.invoiceId === comment.invoiceId && session.status === 'active');

    for (const session of activeSessions) {
      await this.notifyParticipants(session.sessionId, 'comment', {
        type: 'resolved',
        commentId,
        resolvedBy: userId
      }, userId);
    }
  }

  /**
   * Save invoice version
   */
  async saveVersion(
    invoiceId: string,
    content: any,
    changes: Change[],
    userId: string,
    description: string = 'Auto-save',
    isAutoSave: boolean = false,
  ): Promise<Version> {
    this.logger.log(`Saving version for invoice ${invoiceId} by user ${userId}`);

    const versions = this.invoiceVersions.get(invoiceId) || [];
    const versionNumber = versions.length + 1;

    const version: Version = {
      versionId: `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceId,
      versionNumber,
      content,
      changes,
      createdBy: userId,
      createdAt: new Date(),
      description,
      isAutoSave,
    };

    versions.push(version);
    this.invoiceVersions.set(invoiceId, versions);

    // Find active sessions and track save event
    const activeSessions = Array.from(this.activeSessions.values())
      .filter(session => session.invoiceId === invoiceId && session.status === 'active');

    for (const session of activeSessions) {
      await this.trackEvent(session.sessionId, userId, 'save', { 
        versionId: version.versionId,
        isAutoSave,
        description 
      });
    }

    // Record metrics
    this.metricsService.recordVersionSaved(invoiceId, isAutoSave);

    return version;
  }

  /**
   * Get invoice comments
   */
  async getComments(invoiceId: string): Promise<Comment[]> {
    return this.invoiceComments.get(invoiceId) || [];
  }

  /**
   * Get invoice versions
   */
  async getVersions(invoiceId: string): Promise<Version[]> {
    return this.invoiceVersions.get(invoiceId) || [];
  }

  /**
   * Get active session
   */
  async getSession(sessionId: string): Promise<CollaborationSession | null> {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get active sessions for invoice
   */
  async getActiveSessions(invoiceId: string): Promise<CollaborationSession[]> {
    return Array.from(this.activeSessions.values())
      .filter(session => session.invoiceId === invoiceId && session.status === 'active');
  }

  /**
   * Get collaboration statistics
   */
  async getCollaborationStats(tenantId: string): Promise<CollaborationStats> {
    const tenantSessions = Array.from(this.activeSessions.values())
      .filter(session => session.tenantId === tenantId);

    const totalSessions = tenantSessions.length;
    const activeUsers = tenantSessions.reduce((sum, session) => 
      sum + session.participants.filter(p => p.isActive).length, 0);

    const sessionDurations = tenantSessions.map(session => 
      session.lastActivity.getTime() - session.createdAt.getTime()
    );
    const averageSessionDuration = sessionDurations.length > 0 
      ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length 
      : 0;

    // Calculate edits and comments per session
    let totalEdits = 0;
    let totalComments = 0;

    for (const session of tenantSessions) {
      const events = this.sessionEvents.get(session.sessionId) || [];
      totalEdits += events.filter(e => e.type === 'edit').length;
      totalComments += events.filter(e => e.type === 'comment').length;
    }

    const editsPerSession = totalSessions > 0 ? totalEdits / totalSessions : 0;
    const commentsPerSession = totalSessions > 0 ? totalComments / totalSessions : 0;

    // Calculate collaboration score (0-100)
    const collaborationScore = Math.min(100, (
      (activeUsers / Math.max(1, totalSessions)) * 25 +
      (averageSessionDuration / (1000 * 60 * 30)) * 25 + // 30 minutes = full score
      (editsPerSession / 10) * 25 + // 10 edits = full score
      (commentsPerSession / 5) * 25 // 5 comments = full score
    ));

    return {
      totalSessions,
      activeUsers,
      averageSessionDuration,
      editsPerSession,
      commentsPerSession,
      collaborationScore,
    };
  }

  /**
   * End a collaboration session
   */
  async endSession(sessionId: string): Promise<void> {
    this.logger.log(`Ending session ${sessionId}`);

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'ended';
    session.lastActivity = new Date();

    // Mark all participants as inactive
    session.participants.forEach(participant => {
      participant.isActive = false;
    });

    // Remove from active sessions after a delay
    setTimeout(() => {
      this.activeSessions.delete(sessionId);
      this.sessionEvents.delete(sessionId);
    }, 5 * 60 * 1000); // 5 minutes

    // Record metrics
    this.metricsService.recordCollaborationSessionEnded(sessionId);
  }

  /**
   * Track collaboration event
   */
  private async trackEvent(
    sessionId: string,
    userId: string,
    type: CollaborationEvent['type'],
    data?: any,
  ): Promise<void> {
    const event: CollaborationEvent = {
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      userId,
      type,
      timestamp: new Date(),
      data,
    };

    const events = this.sessionEvents.get(sessionId) || [];
    events.push(event);
    this.sessionEvents.set(sessionId, events);

    // Keep only last 1000 events per session
    if (events.length > 1000) {
      this.sessionEvents.set(sessionId, events.slice(-1000));
    }
  }

  /**
   * Notify participants in a session
   */
  private async notifyParticipants(
    sessionId: string,
    eventType: string,
    data: any,
    excludeUserId?: string,
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const participants = session.participants.filter(p => 
      p.isActive && p.userId !== excludeUserId
    );

    // In a real implementation, this would use WebSockets or another real-time communication method
    for (const participant of participants) {
      this.logger.log(`Notifying participant ${participant.userId} of event ${eventType}`);
      // Send notification via WebSocket, push notification, etc.
    }
  }

  /**
   * Broadcast cursor position to other participants
   */
  private async broadcastCursor(
    sessionId: string,
    userId: string,
    cursor: CursorPosition,
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Broadcast to all other active participants
    await this.notifyParticipants(sessionId, 'cursor', { userId, cursor }, userId);
  }

  /**
   * Get default permissions based on role
   */
  private getDefaultPermissions(role: 'owner' | 'editor' | 'viewer'): UserPermissions {
    switch (role) {
      case 'owner':
        return {
          canEdit: true,
          canComment: true,
          canShare: true,
          canApprove: true,
          canExport: true,
        };
      case 'editor':
        return {
          canEdit: true,
          canComment: true,
          canShare: false,
          canApprove: false,
          canExport: true,
        };
      case 'viewer':
        return {
          canEdit: false,
          canComment: true,
          canShare: false,
          canApprove: false,
          canExport: false,
        };
      default:
        return {
          canEdit: false,
          canComment: false,
          canShare: false,
          canApprove: false,
          canExport: false,
        };
    }
  }

  /**
   * Clean up inactive sessions
   */
  async cleanupInactiveSessions(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceLastActivity > inactiveThreshold) {
        await this.endSession(sessionId);
      }
    }
  }
}
