import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoiceBiometric } from '../entities/voice-biometric.entity';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class VoiceAuthenticationService {
  private readonly logger = new Logger(VoiceAuthenticationService.name);
  
  constructor(
    @InjectRepository(VoiceBiometric)
    private voiceBiometricRepository: Repository<VoiceBiometric>,
    private configService: ConfigService,
  ) {}

  /**
   * Enrolls a customer's voice biometric data
   * @param customerId The customer ID
   * @param organizationId The organization ID
   * @param voiceData The raw voice data for enrollment
   * @returns The enrollment result
   */
  async enrollVoiceBiometric(
    customerId: string,
    organizationId: string,
    voiceData: Buffer,
  ): Promise<{ success: boolean; message: string; biometricId?: string }> {
    try {
      this.logger.log(`Enrolling voice biometric for customer ${customerId}`);
      
      // Check if customer already has a voice biometric
      const existingBiometric = await this.voiceBiometricRepository.findOne({
        where: { customerId, organizationId },
      });
      
      if (existingBiometric && existingBiometric.enrollmentStatus === 'completed') {
        return {
          success: false,
          message: 'Customer already has a completed voice biometric enrollment',
        };
      }
      
      // Process voice data to create template
      // In a real implementation, this would call a specialized voice biometric API
      const voiceprintTemplate = await this.processVoiceToTemplate(voiceData);
      
      const confidence = 0.85; // Simulated confidence score
      
      const enrollmentHistory = existingBiometric?.enrollmentHistory || [];
      enrollmentHistory.push({
        date: new Date(),
        status: confidence > 0.7 ? 'completed' : 'failed',
        confidence,
      });
      
      const enrollmentStatus = confidence > 0.7 ? 'completed' : 'failed';
      
      // Create or update the voice biometric
      if (existingBiometric) {
        existingBiometric.voiceprintTemplate = voiceprintTemplate;
        existingBiometric.enrollmentStatus = enrollmentStatus;
        existingBiometric.enrollmentHistory = enrollmentHistory;
        await this.voiceBiometricRepository.save(existingBiometric);
        
        return {
          success: enrollmentStatus === 'completed',
          message: enrollmentStatus === 'completed' 
            ? 'Voice biometric enrollment updated successfully' 
            : 'Voice biometric enrollment failed due to low confidence score',
          biometricId: existingBiometric.id,
        };
      } else {
        const newBiometric = this.voiceBiometricRepository.create({
          customerId,
          organizationId,
          voiceprintTemplate,
          enrollmentStatus,
          enrollmentHistory,
          verificationSuccessRate: 0,
          securitySettings: {
            confidenceThreshold: 0.7,
            maxAttempts: 3,
            lockoutPeriod: 30, // minutes
          },
        });
        
        const savedBiometric = await this.voiceBiometricRepository.save(newBiometric);
        
        return {
          success: enrollmentStatus === 'completed',
          message: enrollmentStatus === 'completed' 
            ? 'Voice biometric enrolled successfully' 
            : 'Voice biometric enrollment failed due to low confidence score',
          biometricId: savedBiometric.id,
        };
      }
    } catch (error) {
      this.logger.error(`Error enrolling voice biometric: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error enrolling voice biometric: ${error.message}`,
      };
    }
  }
  
  /**
   * Verifies a customer's identity using voice biometrics
   * @param customerId The customer ID
   * @param organizationId The organization ID
   * @param voiceData The raw voice data for verification
   * @returns The verification result
   */
  async verifyVoiceBiometric(
    customerId: string,
    organizationId: string,
    voiceData: Buffer,
  ): Promise<{ 
    success: boolean; 
    message: string; 
    confidence?: number;
    attemptsRemaining?: number;
  }> {
    try {
      this.logger.log(`Verifying voice biometric for customer ${customerId}`);
      
      // Find the customer's voice biometric
      const biometric = await this.voiceBiometricRepository.findOne({
        where: { customerId, organizationId },
      });
      
      if (!biometric) {
        return {
          success: false,
          message: 'No voice biometric enrollment found for this customer',
        };
      }
      
      if (biometric.enrollmentStatus !== 'completed') {
        return {
          success: false,
          message: 'Voice biometric enrollment is not complete',
        };
      }
      
      // Check for lockout
      const lastFailedAttempt = biometric.enrollmentHistory
        .filter(h => h.status === 'failed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
      if (lastFailedAttempt) {
        const lockoutPeriod = biometric.securitySettings.lockoutPeriod * 60 * 1000; // convert to ms
        const lockoutTime = new Date(lastFailedAttempt.date).getTime() + lockoutPeriod;
        
        if (lockoutTime > Date.now()) {
          return {
            success: false,
            message: 'Account is temporarily locked due to failed verification attempts',
            attemptsRemaining: 0,
          };
        }
      }
      
      // Process voice data for verification
      // In a real implementation, this would call a specialized voice biometric API
      const verificationResult = await this.verifyVoiceAgainstTemplate(
        voiceData, 
        biometric.voiceprintTemplate
      );
      
      // Update verification history
      const isVerified = verificationResult.confidence >= biometric.securitySettings.confidenceThreshold;
      
      // Update the biometric record
      biometric.lastVerificationDate = new Date();
      
      // Calculate new success rate
      const totalVerifications = biometric.enrollmentHistory.filter(
        h => h.status === 'completed' || h.status === 'failed'
      ).length;
      
      const successfulVerifications = biometric.enrollmentHistory.filter(
        h => h.status === 'completed'
      ).length;
      
      biometric.verificationSuccessRate = totalVerifications > 0 
        ? successfulVerifications / totalVerifications 
        : 0;
        
      // Add to enrollment history
      biometric.enrollmentHistory.push({
        date: new Date(),
        status: isVerified ? 'completed' : 'failed',
        confidence: verificationResult.confidence,
      });
      
      await this.voiceBiometricRepository.save(biometric);
      
      // Calculate attempts remaining
      const recentAttempts = biometric.enrollmentHistory
        .filter(h => {
          const attemptTime = new Date(h.date).getTime();
          const hourAgo = Date.now() - (60 * 60 * 1000);
          return attemptTime > hourAgo && h.status === 'failed';
        })
        .length;
        
      const attemptsRemaining = Math.max(0, biometric.securitySettings.maxAttempts - recentAttempts);
      
      return {
        success: isVerified,
        message: isVerified 
          ? 'Voice biometric verification successful' 
          : 'Voice biometric verification failed',
        confidence: verificationResult.confidence,
        attemptsRemaining,
      };
    } catch (error) {
      this.logger.error(`Error verifying voice biometric: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error verifying voice biometric: ${error.message}`,
      };
    }
  }
  
  /**
   * Updates security settings for a customer's voice biometric
   * @param biometricId The biometric ID
   * @param settings The new security settings
   * @returns The update result
   */
  async updateSecuritySettings(
    biometricId: string,
    settings: {
      confidenceThreshold?: number;
      maxAttempts?: number;
      lockoutPeriod?: number;
    },
  ): Promise<{ success: boolean; message: string }> {
    try {
      const biometric = await this.voiceBiometricRepository.findOne({
        where: { id: biometricId },
      });
      
      if (!biometric) {
        return {
          success: false,
          message: 'Voice biometric not found',
        };
      }
      
      // Update settings
      biometric.securitySettings = {
        ...biometric.securitySettings,
        ...settings,
      };
      
      await this.voiceBiometricRepository.save(biometric);
      
      return {
        success: true,
        message: 'Security settings updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error updating security settings: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error updating security settings: ${error.message}`,
      };
    }
  }
  
  /**
   * Deletes a customer's voice biometric data
   * @param customerId The customer ID
   * @param organizationId The organization ID
   * @returns The deletion result
   */
  async deleteVoiceBiometric(
    customerId: string,
    organizationId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.voiceBiometricRepository.delete({
        customerId,
        organizationId,
      });
      
      if (result.affected === 0) {
        return {
          success: false,
          message: 'No voice biometric found for this customer',
        };
      }
      
      return {
        success: true,
        message: 'Voice biometric deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Error deleting voice biometric: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error deleting voice biometric: ${error.message}`,
      };
    }
  }
  
  /**
   * Processes raw voice data to create a biometric template
   * @param voiceData The raw voice data
   * @returns The processed template
   */
  private async processVoiceToTemplate(voiceData: Buffer): Promise<Buffer> {
    // In a real implementation, this would call a specialized voice biometric API
    // For now, we'll simulate the process with a hash of the data
    
    // Apply encryption to the template for secure storage
    const encryptionKey = this.configService.get<string>('VOICE_ENCRYPTION_KEY');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(
      'aes-256-cbc', 
      Buffer.from(encryptionKey, 'hex'), 
      iv
    );
    
    const encrypted = Buffer.concat([
      cipher.update(voiceData),
      cipher.final(),
    ]);
    
    // Prepend IV to encrypted data for later decryption
    return Buffer.concat([iv, encrypted]);
  }
  
  /**
   * Verifies voice data against a stored template
   * @param voiceData The raw voice data
   * @param template The stored template
   * @returns The verification result
   */
  private async verifyVoiceAgainstTemplate(
    voiceData: Buffer,
    template: Buffer,
  ): Promise<{ confidence: number }> {
    // In a real implementation, this would call a specialized voice biometric API
    // For now, we'll simulate the verification process
    
    // Extract IV from the beginning of the template
    const iv = template.slice(0, 16);
    const encryptedTemplate = template.slice(16);
    
    // Decrypt the template
    const encryptionKey = this.configService.get<string>('VOICE_ENCRYPTION_KEY');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      Buffer.from(encryptionKey, 'hex'), 
      iv
    );
    
    const decrypted = Buffer.concat([
      decipher.update(encryptedTemplate),
      decipher.final(),
    ]);
    
    // Simulate comparison and confidence score
    // In a real system, this would use sophisticated voice biometric algorithms
    const similarity = this.simulateVoiceComparison(voiceData, decrypted);
    
    return { confidence: similarity };
  }
  
  /**
   * Simulates voice comparison for demonstration purposes
   * @param voiceData1 First voice sample
   * @param voiceData2 Second voice sample
   * @returns Simulated similarity score
   */
  private simulateVoiceComparison(voiceData1: Buffer, voiceData2: Buffer): number {
    // This is a simplified simulation for demonstration purposes
    // Real voice biometric systems use complex algorithms for comparison
    
    // Create hashes of both samples
    const hash1 = crypto.createHash('sha256').update(voiceData1).digest();
    const hash2 = crypto.createHash('sha256').update(voiceData2).digest();
    
    // Count matching bytes as a simple similarity measure
    let matchingBytes = 0;
    const minLength = Math.min(hash1.length, hash2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (hash1[i] === hash2[i]) {
        matchingBytes++;
      }
    }
    
    // Calculate similarity as percentage of matching bytes
    const similarity = matchingBytes / minLength;
    
    // Add some randomness to simulate real-world variation
    const randomFactor = Math.random() * 0.2 - 0.1; // -0.1 to +0.1
    
    // Ensure the result is between 0 and 1
    return Math.max(0, Math.min(1, similarity + randomFactor));
  }
}
