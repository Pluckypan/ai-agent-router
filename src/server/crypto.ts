import CryptoJS from 'crypto-js';

// Simple encryption key - in production, use environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

export function encryptApiKey(apiKey: string): string {
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
}

export function decryptApiKey(encryptedApiKey: string): string {
  if (!encryptedApiKey || encryptedApiKey.trim() === '') {
    throw new Error('Encrypted API key is empty');
  }
  
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedApiKey, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted || decrypted.trim() === '') {
      // If decryption returns empty, the key might not be encrypted
      // Try to return the original value (for backward compatibility with unencrypted keys)
      console.warn('[Crypto] Decryption returned empty string, key might not be encrypted');
      return encryptedApiKey;
    }
    
    return decrypted;
  } catch (error: any) {
    console.error('[Crypto] Decryption error:', error.message);
    // If decryption fails, the key might not be encrypted (backward compatibility)
    // Return the original value and let the API call fail with proper error
    console.warn('[Crypto] Decryption failed, assuming key is not encrypted (backward compatibility)');
    return encryptedApiKey;
  }
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
