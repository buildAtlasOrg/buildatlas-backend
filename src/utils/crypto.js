const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt({ encrypted, iv, authTag }) {
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
