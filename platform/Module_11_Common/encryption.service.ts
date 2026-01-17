import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-cbc";
  private readonly key: Buffer;
  private readonly ivLength = 16; // For AES, this is always 16

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>("ENCRYPTION_SECRET_KEY");
    if (!secretKey || secretKey.length !== 32) {
      throw new Error("ENCRYPTION_SECRET_KEY must be defined in .env and be 32 characters long.");
    }
    this.key = Buffer.from(secretKey, "utf8");
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }

  decrypt(text: string): string {
    try {
      const parts = text.split(":");
      if (parts.length !== 2) {
        throw new Error("Invalid encrypted text format. Expected iv:encryptedText");
      }
      const iv = Buffer.from(parts.shift(), "hex");
      const encryptedText = Buffer.from(parts.join(":"), "hex");
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString("utf8");
    } catch (error) {
      // Log the error or handle it as per application requirements
      // For example, if decryption fails, it might indicate tampered data or wrong key
      console.error("Decryption failed:", error);
      // Depending on the use case, you might want to throw the error or return a specific value
      // For sensitive data, failing loudly is often better.
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
}

