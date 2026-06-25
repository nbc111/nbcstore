import crypto from 'crypto';
export function generateAuthNonce() {
    return crypto.randomBytes(16).toString('hex');
}
