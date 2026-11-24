import assert from 'node:assert';
import {
  sha256Hex,
  generateTotpPayload,
  parseTotpPayload,
  verifyTotpPayloadLocally,
} from './totpQr.js';

console.log('🧪 Starting Mobile Dynamic TOTP QR Engine Tests...\n');

// 1. SHA-256 Digest Verification
console.log('🔑 1. Testing SHA-256 cryptographic digest engine...');
const sampleDigest = await sha256Hex('test_resident_secret');
assert.strictEqual(
  sampleDigest,
  '1befe25537f0c425ee9d5e1d2ef80bd5e62963870c71ba57e289f0cf058d8809',
  'SHA-256 digest should match known vector'
);
console.log('✅ SHA-256 digest verified.\n');

// 2. TOTP Payload Generation
console.log('📱 2. Testing dynamic 4-part TOTP QR payload generation...');
const fixedTimestamp = 1716500000;
const payloadObj = await generateTotpPayload({
  familyId: 42,
  headcount: 5,
  secret: 'secret_qr_token_abc',
  timestamp: fixedTimestamp,
});

assert.strictEqual(payloadObj.familyId, '42');
assert.strictEqual(payloadObj.timestamp, fixedTimestamp);
assert.strictEqual(payloadObj.headcount, 5);

// Verify expected HMAC matches format: familyId:timestamp:headcount+secret
const expectedDataToSign = `42:${fixedTimestamp}:5secret_qr_token_abc`;
const expectedHash = await sha256Hex(expectedDataToSign);
assert.strictEqual(payloadObj.hash, expectedHash);
assert.strictEqual(
  payloadObj.payload,
  `42:${fixedTimestamp}:${expectedHash}:5`,
  'Payload format must strictly follow familyId:timestamp:hash:headcount'
);
console.log('✅ Dynamic 4-part TOTP QR payload generation verified.\n');

// 3. Payload Parsing
console.log('🔍 3. Testing TOTP QR payload parser...');

// 3a. 4-part dynamic
const parsed4 = parseTotpPayload(`42:${fixedTimestamp}:${expectedHash}:5`);
assert.strictEqual(parsed4.isDynamicTotp, true);
assert.strictEqual(parsed4.familyId, '42');
assert.strictEqual(parsed4.timestamp, fixedTimestamp);
assert.strictEqual(parsed4.hash, expectedHash);
assert.strictEqual(parsed4.headcount, 5);

// 3b. 3-part legacy dynamic
const parsed3 = parseTotpPayload(`42:${fixedTimestamp}:${expectedHash}`);
assert.strictEqual(parsed3.isDynamicTotp, true);
assert.strictEqual(parsed3.familyId, '42');
assert.strictEqual(parsed3.timestamp, fixedTimestamp);
assert.strictEqual(parsed3.hash, expectedHash);
assert.strictEqual(parsed3.headcount, null);

// 3c. 1-part static hash
const parsedStatic = parseTotpPayload('hash_static_code_123');
assert.strictEqual(parsedStatic.isDynamicTotp, false);
assert.strictEqual(parsedStatic.familyId, null);
assert.strictEqual(parsedStatic.hash, 'hash_static_code_123');
console.log('✅ 4-part, 3-part, and static payload parsing verified.\n');

// 4. Local Verification & Backend Parity (FamilyProfile::verifyTotpPayload)
console.log('🛡️ 4. Testing TOTP local signature & anti-replay verification...');

// 4a. Valid current signature
const verifyCurrent = await verifyTotpPayloadLocally(
  payloadObj.payload,
  ['secret_qr_token_abc'],
  { currentTimestamp: fixedTimestamp + 10 } // 10 seconds later
);
assert.strictEqual(verifyCurrent.valid, true, 'Current signature must be valid');
assert.strictEqual(verifyCurrent.matchedSecret, 'secret_qr_token_abc');

// 4b. Multiple candidate secrets (e.g. user_id fallback hash)
const verifyCandidates = await verifyTotpPayloadLocally(
  payloadObj.payload,
  ['hash_wrong_secret', 'secret_qr_token_abc'],
  { currentTimestamp: fixedTimestamp + 10 }
);
assert.strictEqual(verifyCandidates.valid, true, 'Should find matching candidate secret');
assert.strictEqual(verifyCandidates.matchedSecret, 'secret_qr_token_abc');

// 4c. Expired signature (> 300 seconds / 5 minutes)
const verifyExpired = await verifyTotpPayloadLocally(
  payloadObj.payload,
  ['secret_qr_token_abc'],
  { currentTimestamp: fixedTimestamp + 305 } // 305 seconds later
);
assert.strictEqual(verifyExpired.valid, false, 'Expired QR code (>300s) must be rejected');
assert.match(verifyExpired.reason, /expired/i, 'Reason must state expiration');

// 4d. Tampered headcount
const tamperedPayload = `42:${fixedTimestamp}:${expectedHash}:99`;
const verifyTampered = await verifyTotpPayloadLocally(
  tamperedPayload,
  ['secret_qr_token_abc'],
  { currentTimestamp: fixedTimestamp + 10 }
);
assert.strictEqual(verifyTampered.valid, false, 'Tampered headcount must fail HMAC check');
assert.match(verifyTampered.reason, /invalid/i);

// 4e. Static QR verification
const verifyStatic = await verifyTotpPayloadLocally(
  'hash_static_code_123',
  ['hash_static_code_123']
);
assert.strictEqual(verifyStatic.valid, true);

console.log('✅ Local TOTP verification and anti-replay constraints verified.\n');

console.log('🎉 ALL MOBILE TOTP QR ENGINE TESTS COMPLETED SUCCESSFULLY!');
