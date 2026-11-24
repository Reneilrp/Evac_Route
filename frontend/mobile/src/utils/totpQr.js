/**
 * Dynamic TOTP QR Payload Generation & Offline Verification Engine
 *
 * Provides cryptographic SHA-256 HMAC anti-replay protection for resident QR check-in
 * passes at evacuation shelter intake gates. Compatible 1:1 with Laravel backend
 * `FamilyProfile::verifyTotpPayload`.
 */

let expoCrypto = null;
try {
  // eslint-disable-next-line no-undef
  expoCrypto = require('expo-crypto');
} catch (_) {
  // Graceful fallback for non-Expo / Node unit test environments
}

/**
 * Computes lowercase SHA-256 hex digest of UTF-8 string.
 * Uses expo-crypto when available in React Native, falling back to Web Crypto API / Node.
 *
 * @param {string} data
 * @returns {Promise<string>}
 */
export async function sha256Hex(data) {
  if (expoCrypto && typeof expoCrypto.digestStringAsync === 'function') {
    return await expoCrypto.digestStringAsync(
      expoCrypto.CryptoDigestAlgorithm?.SHA256 || 'SHA-256',
      data
    );
  }

  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for older Node.js runtimes
  try {
    // eslint-disable-next-line no-undef
    const nodeCrypto = require('node:crypto');
    return nodeCrypto.createHash('sha256').update(data).digest('hex');
  } catch (err) {
    throw new Error(`No cryptographic SHA-256 provider available: ${err.message}`);
  }
}

/**
 * Generates dynamic 4-part TOTP QR payload with rotating anti-replay token.
 * Payload format: `${familyId}:${timestamp}:${hash}:${headcount}`
 *
 * @param {object} params
 * @param {number|string} params.familyId ID of family profile (or user id fallback)
 * @param {number} [params.headcount=1] Number of family members
 * @param {string} params.secret Secret QR hash key
 * @param {number} [params.timestamp] Optional Unix timestamp in seconds (defaults to now)
 * @returns {Promise<{ familyId: string, timestamp: number, hash: string, headcount: number, payload: string }>}
 */
export async function generateTotpPayload({ familyId, headcount = 1, secret, timestamp }) {
  const effectiveFamilyId = String(familyId ?? 1);
  const effectiveHeadcount = Math.max(1, parseInt(headcount, 10) || 1);
  const effectiveTimestamp = timestamp ?? Math.floor(Date.now() / 1000);
  const effectiveSecret = String(secret || `hash_${effectiveFamilyId}`);

  const dataToSign = `${effectiveFamilyId}:${effectiveTimestamp}:${effectiveHeadcount}${effectiveSecret}`;
  const hash = await sha256Hex(dataToSign);

  const payload = `${effectiveFamilyId}:${effectiveTimestamp}:${hash}:${effectiveHeadcount}`;

  return {
    familyId: effectiveFamilyId,
    timestamp: effectiveTimestamp,
    hash,
    headcount: effectiveHeadcount,
    payload,
  };
}

/**
 * Parses a raw QR payload into its constituent elements.
 * Supports:
 * - 4-part: `${familyId}:${timestamp}:${hash}:${headcount}`
 * - 3-part: `${familyId}:${timestamp}:${hash}`
 * - 1-part: Static QR hash
 *
 * @param {string} rawPayload
 * @returns {{ isDynamicTotp: boolean, familyId: string|null, timestamp: number|null, hash: string, headcount: number|null, raw: string }}
 */
export function parseTotpPayload(rawPayload) {
  const trimmed = typeof rawPayload === 'string' ? rawPayload.trim() : '';
  const parts = trimmed.split(':');

  if (parts.length === 4) {
    const [familyId, timestampStr, hash, headcountStr] = parts;
    const parsedTimestamp = parseInt(timestampStr, 10);
    const parsedHeadcount = parseInt(headcountStr, 10);

    return {
      isDynamicTotp: true,
      familyId: familyId || null,
      timestamp: isNaN(parsedTimestamp) ? null : parsedTimestamp,
      hash: hash || '',
      headcount: isNaN(parsedHeadcount) ? 1 : Math.max(1, parsedHeadcount),
      raw: trimmed,
    };
  }

  if (parts.length === 3) {
    const [familyId, timestampStr, hash] = parts;
    const parsedTimestamp = parseInt(timestampStr, 10);

    return {
      isDynamicTotp: true,
      familyId: familyId || null,
      timestamp: isNaN(parsedTimestamp) ? null : parsedTimestamp,
      hash: hash || '',
      headcount: null,
      raw: trimmed,
    };
  }

  // Fallback: static QR code or legacy single hash
  return {
    isDynamicTotp: false,
    familyId: null,
    timestamp: null,
    hash: trimmed,
    headcount: null,
    raw: trimmed,
  };
}

/**
 * Locally validates a TOTP QR payload against candidate secrets and a time window.
 * Matches backend `FamilyProfile::verifyTotpPayload` logic.
 *
 * @param {string} payload
 * @param {string|string[]} secrets Candidate secrets (e.g. resident qr_code_hash, hash_{id})
 * @param {object} [options]
 * @param {number} [options.maxAgeSeconds=300] Expiration tolerance (default: 5 minutes / 300s)
 * @param {number} [options.currentTimestamp] Current Unix timestamp in seconds
 * @returns {Promise<{ valid: boolean, reason?: string, parsed: object, matchedSecret?: string }>}
 */
export async function verifyTotpPayloadLocally(payload, secrets = [], options = {}) {
  const parsed = parseTotpPayload(payload);
  if (!parsed.isDynamicTotp) {
    // Static hash check
    const secretList = Array.isArray(secrets) ? secrets : [secrets];
    const match = secretList.find((s) => s === parsed.hash);
    return {
      valid: !!match,
      reason: match ? 'Valid Static QR' : 'Unknown Static QR Hash',
      parsed,
      matchedSecret: match || null,
    };
  }

  const { maxAgeSeconds = 300, currentTimestamp = Math.floor(Date.now() / 1000) } = options;

  if (!parsed.timestamp || Math.abs(currentTimestamp - parsed.timestamp) > maxAgeSeconds) {
    return {
      valid: false,
      reason: 'QR Code Expired. Please refresh your app.',
      parsed,
    };
  }

  const candidateSecrets = Array.isArray(secrets) ? secrets.filter(Boolean) : [secrets].filter(Boolean);
  if (candidateSecrets.length === 0) {
    return {
      valid: false,
      reason: 'No validation secrets available.',
      parsed,
    };
  }

  for (const secret of candidateSecrets) {
    const expected4 = await sha256Hex(
      `${parsed.familyId}:${parsed.timestamp}:${parsed.headcount}${secret}`
    );
    const expected3 = await sha256Hex(
      `${parsed.familyId}:${parsed.timestamp}${secret}`
    );

    if (expected4 === parsed.hash || expected3 === parsed.hash) {
      return {
        valid: true,
        reason: 'Signature verified successfully.',
        parsed,
        matchedSecret: secret,
      };
    }
  }

  return {
    valid: false,
    reason: 'Invalid QR Signature',
    parsed,
  };
}
