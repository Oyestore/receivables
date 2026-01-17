import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly userRepository: Repository<User>,
  ) {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendReportEmail(
    to: string | string[],
    subject: string,
    reportName: string,
    reportPath: string,
    reportFormat: string,
    metadata: any = {},
  ): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@analytics.com',
        to: Array.isArray(to) ? to : [to],
        subject,
        html: this.generateReportEmailTemplate(reportName, reportFormat, metadata),
        attachments: [
          {
            filename: `${reportName}.${reportFormat}`,
            path: reportPath,
          },
        ],
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Report email sent to: ${Array.isArray(to) ? to.join(', ') : to}`);
    } catch (error) {
      this.logger.error('Error sending report email:', error);
      throw error;
    }
  }

  async sendDashboardShareEmail(
    to: string,
    dashboardName: string,
    sharedBy: string,
    dashboardUrl: string,
    message?: string,
  ): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@analytics.com',
        to,
        subject: `Dashboard Shared: ${dashboardName}`,
        html: this.generateDashboardShareEmailTemplate(dashboardName, sharedBy, dashboardUrl, message),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Dashboard share email sent to: ${to}`);
    } catch (error) {
      this.logger.error('Error sending dashboard share email:', error);
      throw error;
    }
  }

  async sendAnomalyAlertEmail(
    to: string | string[],
    anomalyTitle: string,
    anomalyDescription: string,
    severity: string,
    dashboardUrl: string,
    metadata: any = {},
  ): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@analytics.com',
        to: Array.isArray(to) ? to : [to],
        subject: `🚨 Anomaly Alert: ${anomalyTitle}`,
        html: this.generateAnomalyAlertEmailTemplate(anomalyTitle, anomalyDescription, severity, dashboardUrl, metadata),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Anomaly alert email sent to: ${Array.isArray(to) ? to.join(', ') : to}`);
    } catch (error) {
      this.logger.error('Error sending anomaly alert email:', error);
      throw error;
    }
  }

  async sendSystemAlertEmail(
    to: string | string[],
    alertTitle: string,
    alertMessage: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata: any = {},
  ): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@analytics.com',
        to: Array.isArray(to) ? to : [to],
        subject: `System Alert: ${alertTitle}`,
        html: this.generateSystemAlertEmailTemplate(alertTitle, alertMessage, severity, metadata),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`System alert email sent to: ${Array.isArray(to) ? to.join(', ') : to}`);
    } catch (error) {
      this.logger.error('Error sending system alert email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@analytics.com',
        to: user.email,
        subject: 'Welcome to Analytics & Reporting Platform',
        html: this.generateWelcomeEmailTemplate(user.firstName, user.email),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to: ${user.email}`);
    } catch (error) {
      this.logger.error('Error sending welcome email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@analytics.com',
        to: email,
        subject: 'Password Reset Request',
        html: this.generatePasswordResetEmailTemplate(resetUrl),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to: ${email}`);
    } catch (error) {
      this.logger.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendEmailVerificationEmail(email: string, verificationToken: string): Promise<void> {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@analytics.com',
        to: email,
        subject: 'Email Verification',
        html: this.generateEmailVerificationTemplate(verificationUrl),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email verification sent to: ${email}`);
    } catch (error) {
      this.logger.error('Error sending email verification:', error);
      throw error;
    }
  }

  private generateReportEmailTemplate(reportName: string, reportFormat: string, metadata: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Report Generated: ${reportName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #333; margin: 0; }
          .content { margin-bottom: 30px; }
          .footer { text-align: center; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Report Generated</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your report <strong>${reportName}</strong> has been generated successfully.</p>
            <p><strong>Format:</strong> ${reportFormat.toUpperCase()}</p>
            <p><strong>Generated at:</strong> ${new Date().toLocaleString()}</p>
            ${metadata.description ? `<p><strong>Description:</strong> ${metadata.description}</p>` : ''}
            <p>The report is attached to this email for your convenience.</p>
          </div>
          <div class="footer">
            <p>© 2026 Analytics & Reporting Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateDashboardShareEmailTemplate(dashboardName: string, sharedBy: string, dashboardUrl: string, message?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Dashboard Shared: ${dashboardName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #333; margin: 0; }
          .content { margin-bottom: 30px; }
          .footer { text-align: center; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📈 Dashboard Shared</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p><strong>${sharedBy}</strong> has shared the dashboard <strong>${dashboardName}</strong> with you.</p>
            ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
            <p>You can access the dashboard by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${dashboardUrl}" class="button">View Dashboard</a>
            </p>
          </div>
          <div class="footer">
            <p>© 2026 Analytics & Reporting Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateAnomalyAlertEmailTemplate(anomalyTitle: string, anomalyDescription: string, severity: string, dashboardUrl: string, metadata: any): string {
    const severityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>🚨 Anomaly Alert: ${anomalyTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #333; margin: 0; }
          .alert { padding: 15px; border-radius: 5px; margin-bottom: 20px; background-color: ${severityColors[severity] || '#ffc107'}; color: white; }
          .content { margin-bottom: 30px; }
          .footer { text-align: center; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Anomaly Alert</h1>
          </div>
          <div class="alert">
            <strong>Severity:</strong> ${severity.toUpperCase()}
          </div>
          <div class="content">
            <p><strong>Anomaly:</strong> ${anomalyTitle}</p>
            <p><strong>Description:</strong> ${anomalyDescription}</p>
            <p><strong>Detected at:</strong> ${new Date().toLocaleString()}</p>
            ${metadata.metricName ? `<p><strong>Metric:</strong> ${metadata.metricName}</p>` : ''}
            ${metadata.metricValue ? `<p><strong>Value:</strong> ${metadata.metricValue}</p>` : ''}
            <p>Please review this anomaly in your dashboard:</p>
            <p style="text-align: center;">
              <a href="${dashboardUrl}" class="button">View Dashboard</a>
            </p>
          </div>
          <div class="footer">
            <p>© 2026 Analytics & Reporting Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateSystemAlertEmailTemplate(alertTitle: string, alertMessage: string, severity: string, metadata: any): string {
    const severityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>System Alert: ${alertTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #333; margin: 0; }
          .alert { padding: 15px; border-radius: 5px; margin-bottom: 20px; background-color: ${severityColors[severity] || '#ffc107'}; color: white; }
          .content { margin-bottom: 30px; }
          .footer { text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ System Alert</h1>
          </div>
          <div class="alert">
            <strong>Severity:</strong> ${severity.toUpperCase()}
          </div>
          <div class="content">
            <p><strong>Alert:</strong> ${alertTitle}</p>
            <p><strong>Message:</strong> ${alertMessage}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            ${metadata.component ? `<p><strong>Component:</strong> ${metadata.component}</p>` : ''}
            ${metadata.action ? `<p><strong>Recommended Action:</strong> ${metadata.action}</p>` : ''}
          </div>
          <div class="footer">
            <p>© 2026 Analytics & Reporting Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeEmailTemplate(firstName: string, email: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Analytics & Reporting Platform</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #333; margin: 0; }
          .content { margin-bottom: 30px; }
          .footer { text-align: center; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Analytics & Reporting!</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Welcome to the Analytics & Reporting Platform! We're excited to have you on board.</p>
            <p>Your account has been created with the email: <strong>${email}</strong></p>
            <p>Get started by exploring our powerful analytics features:</p>
            <ul>
              <li>📊 Create custom dashboards</li>
              <li>📈 Generate insightful reports</li>
              <li>🤖 AI-powered analytics</li>
              <li>🔄 Real-time data monitoring</li>
            </ul>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}" class="button">Get Started</a>
            </p>
          </div>
          <div class="footer">
            <p>© 2026 Analytics & Reporting Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePasswordResetEmailTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Request</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #333; margin: 0; }
          .content { margin-bottom: 30px; }
          .footer { text-align: center; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You requested a password reset for your account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p><strong>Note:</strong> This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2026 Analytics & Reporting Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateEmailVerificationTemplate(verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #333; margin: 0; }
          .content { margin-bottom: 30px; }
          .footer { text-align: center; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✉️ Email Verification</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Please verify your email address to complete your registration.</p>
            <p>Click the button below to verify your email:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </p>
            <p><strong>Note:</strong> This link will expire in 24 hours for security reasons.</p>
          </div>
          <div class="footer">
            <p>© 2026 Analytics & Reporting Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
