import crypto from 'crypto';

export function generateAuthNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}
