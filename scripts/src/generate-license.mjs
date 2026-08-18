#!/usr/bin/env node
/**
 * Issue one signed offline activation code.
 *
 * Example:
 * pnpm --filter @workspace/scripts generate-license -- \
 *   --private-key ./license-keys/private_key.pem \
 *   --subscriber-id IMT-ABC123 \
 *   --plan QUARTERLY
 */
import { createSign, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const required = (flag) => {
  const value = valueAfter(flag);
  if (!value) throw new Error(`Missing required argument: ${flag}`);
  return value;
};
const base64Url = (value) => Buffer.from(value).toString('base64url');

const privateKeyPath = required('--private-key');
const subscriberId = required('--subscriber-id').trim().toUpperCase();
const plan = required('--plan').trim().toUpperCase();
const allowedPlans = new Set(['MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME']);

if (!/^IMT-[A-Z0-9_-]{4,60}$/.test(subscriberId)) {
  throw new Error('subscriber-id must be the IMT-... value shown in the app.');
}
if (!allowedPlans.has(plan)) {
  throw new Error('plan must be MONTHLY, QUARTERLY, YEARLY, or LIFETIME.');
}

const issuedAt = new Date();
const requestedExpiry = valueAfter('--expires-at');
const expiresAt = requestedExpiry
  ? new Date(requestedExpiry)
  : new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
if (!Number.isFinite(expiresAt.getTime())) throw new Error('--expires-at must be an ISO date.');

const payload = {
  v: 2,
  plan,
  subscriberId,
  nonce: randomBytes(16).toString('base64url'),
  issuedAt: issuedAt.toISOString(),
  expiresAt: expiresAt.toISOString(),
};
const encodedPayload = base64Url(JSON.stringify(payload));
const signer = createSign('RSA-SHA256');
signer.update(encodedPayload);
signer.end();
const signature = signer.sign(await readFile(privateKeyPath)).toString('base64url');

console.log(`${encodedPayload}.${signature}`);
console.error('');
console.error(`Plan: ${plan}`);
console.error(`Subscriber: ${subscriberId}`);
console.error(`Code valid until: ${payload.expiresAt}`);