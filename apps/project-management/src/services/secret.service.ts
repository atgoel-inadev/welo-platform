import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PluginSecret } from '@app/common/entities';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;   // 128-bit IV
const TAG_LENGTH = 16;  // 128-bit auth tag

@Injectable()
export class SecretService {
  private readonly logger = new Logger(SecretService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(PluginSecret)
    private readonly secretRepository: Repository<PluginSecret>,
  ) {
    const keyHex = process.env.PLUGIN_SECRETS_KEY;
    if (keyHex && keyHex.length === 64) {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    } else {
      // Dev fallback — 32 zero bytes (not production-safe)
      this.logger.warn('PLUGIN_SECRETS_KEY not set or invalid — using insecure dev key');
      this.encryptionKey = Buffer.alloc(32, 0);
    }
  }

  private encrypt(plaintext: string): { encryptedValue: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv) as crypto.CipherGCM;
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      encryptedValue: encrypted.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  decrypt(secret: PluginSecret): string {
    const iv = Buffer.from(secret.iv, 'hex');
    const authTag = Buffer.from(secret.authTag, 'hex');
    const encryptedData = Buffer.from(secret.encryptedValue, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    return decipher.update(encryptedData).toString('utf8') + decipher.final('utf8');
  }

  async createSecret(
    projectId: string,
    name: string,
    value: string,
    description: string | undefined,
    createdBy: string | null,
  ): Promise<{ id: string; name: string; description: string }> {
    // Validate name format: uppercase letters, digits, underscores
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
      throw new BadRequestException(
        'Secret name must start with an uppercase letter and contain only uppercase letters, digits, and underscores',
      );
    }

    const existing = await this.secretRepository.findOne({ where: { projectId, name } });
    if (existing) {
      throw new BadRequestException(`Secret "${name}" already exists for this project`);
    }

    const { encryptedValue, iv, authTag } = this.encrypt(value);

    const secret = this.secretRepository.create({
      projectId,
      name,
      encryptedValue,
      iv,
      authTag,
      description,
      createdBy,
    });

    const saved = await this.secretRepository.save(secret);
    return { id: saved.id, name: saved.name, description: saved.description };
  }

  async listSecrets(projectId: string): Promise<Array<{ id: string; name: string; description: string; createdAt: Date }>> {
    const secrets = await this.secretRepository.find({
      where: { projectId },
      order: { createdAt: 'ASC' },
      select: ['id', 'name', 'description', 'createdAt'],
    });
    return secrets as any;
  }

  async deleteSecret(projectId: string, name: string): Promise<void> {
    const secret = await this.secretRepository.findOne({ where: { projectId, name } });
    if (!secret) {
      throw new NotFoundException(`Secret "${name}" not found`);
    }
    await this.secretRepository.remove(secret);
  }

  /**
   * Resolves {{secrets.KEY}} tokens in a template string.
   * Only for internal use by PluginRunnerService — never expose decrypted values to clients.
   */
  async resolveSecrets(projectId: string, template: string): Promise<string> {
    const secretPattern = /\{\{secrets\.([A-Z][A-Z0-9_]*)\}\}/g;
    const matches = [...template.matchAll(secretPattern)];
    if (matches.length === 0) return template;

    const secretNames = [...new Set(matches.map((m) => m[1]))];
    const secrets = await this.secretRepository.find({
      where: secretNames.map((name) => ({ projectId, name })),
    });

    const secretMap = new Map<string, string>();
    for (const secret of secrets) {
      secretMap.set(secret.name, this.decrypt(secret));
    }

    return template.replace(secretPattern, (_, key) => secretMap.get(key) ?? `{{secrets.${key}}}`);
  }
}
