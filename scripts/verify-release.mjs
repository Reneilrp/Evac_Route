import { createHash } from 'node:crypto';

const baseUrl = process.env.RELEASE_BASE_URL || 'https://evacroute.app';
const expectedVersion = process.env.RELEASE_VERSION || '1.2.1';
const expectedFileName = process.env.RELEASE_APK || 'EvacRoute.apk';
const apkUrl = new URL(`/downloads/${expectedFileName}`, baseUrl);

const response = await fetch(apkUrl, { method: 'GET', redirect: 'follow' });
if (!response.ok) {
  throw new Error(`APK download failed: ${response.status} ${response.statusText}`);
}

const contentType = response.headers.get('content-type') || '';
if (!contentType.includes('application') && !contentType.includes('octet-stream')) {
  throw new Error(`Unexpected APK content type: ${contentType}`);
}

const body = Buffer.from(await response.arrayBuffer());
if (body.length === 0) {
  throw new Error('APK response was empty');
}

const checksum = createHash('sha256').update(body).digest('hex');
console.log(JSON.stringify({
  baseUrl,
  version: expectedVersion,
  apkUrl: response.url,
  fileName: expectedFileName,
  bytes: body.length,
  sha256: checksum,
}, null, 2));
