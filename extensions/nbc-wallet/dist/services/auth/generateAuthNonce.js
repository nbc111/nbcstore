import crypto from 'crypto';
export function generateAuthNonce() {
    return crypto.randomBytes(16).toString('hex');
}
//# sourceMappingURL=generateAuthNonce.js.map