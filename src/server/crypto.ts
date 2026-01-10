import CryptoJS from 'crypto-js';

// Simple encryption key - in production, use environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

export function encryptApiKey(apiKey: string): string {
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
}

export function decryptApiKey(encryptedApiKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedApiKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '***';
  }
  return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
}

export function maskToken(token: string): string {
  if (!token || token.length < 10) {
    return '***';
  }
  return token.substring(0, 6) + '***' + token.substring(token.length - 6);
}
