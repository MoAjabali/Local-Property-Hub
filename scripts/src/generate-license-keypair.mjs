#!/usr/bin/env node
/**
 * Generate the RSA key pair used by the offline license system.
 *
 * Keep private_key.pem only on the owner's secure machine. The app receives
 * public_key.pub, copied into artifacts/mobile/constants/licensePublicKey.ts.
 */
import { generateKeyPairSync } from 'node:crypto';
import { mkdir, chmod, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const outDir = resolve(valueAfter('--out-dir', './license-keys'));
await mkdir(outDir, { recursive: true });

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const privatePath = resolve(outDir, 'private_key.pem');
const publicPath = resolve(outDir, 'public_key.pub');
await writeFile(privatePath, privateKey, { encoding: 'utf8', mode: 0o600 });
await chmod(privatePath, 0o600);
await writeFile(publicPath, publicKey, { encoding: 'utf8', mode: 0o644 });

console.log(`Private key: ${privatePath}`);
console.log(`Public key:  ${publicPath}`);
console.log('');
console.log('Copy only public_key.pub into the mobile app.');
console.log('Never upload, commit, or ship private_key.pem.');