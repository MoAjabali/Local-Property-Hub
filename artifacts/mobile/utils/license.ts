import { KJUR, KEYUTIL, b64utohex, hextorstr } from 'jsrsasign';
import { LICENSE_PUBLIC_KEY } from '@/constants/licensePublicKey';
import { Subscription, SubscriptionTier } from '@/types';

export type LicensePlan = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'LIFETIME';

export interface LicensePayload {
  v: 2;
  plan: LicensePlan;
  subscriberId: string;
  nonce: string;
  issuedAt: string;
  /**
   * Optional signed deadline for the activation code itself. It is not the
   * subscription expiry; the app calculates that from the selected plan.
   */
  expiresAt?: string;
}

export type LicenseVerification =
  | { ok: true; payload: LicensePayload }
  | { ok: false; error: string };

const VALID_PLANS: LicensePlan[] = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME'];
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function isPayload(value: unknown): value is LicensePayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<LicensePayload>;
  return payload.v === 2
    && typeof payload.plan === 'string'
    && VALID_PLANS.includes(payload.plan as LicensePlan)
    && typeof payload.subscriberId === 'string'
    && /^[A-Za-z0-9_-]{4,64}$/.test(payload.subscriberId)
    && typeof payload.nonce === 'string'
    && /^[A-Za-z0-9_-]{12,128}$/.test(payload.nonce)
    && isIsoDate(payload.issuedAt)
    && (payload.expiresAt === undefined || isIsoDate(payload.expiresAt));
}

function decodePayload(encoded: string): unknown {
  // License payloads are ASCII JSON by design, so jsrsasign's raw-string
  // decoder is sufficient on both native Expo and web.
  return JSON.parse(hextorstr(b64utohex(encoded)));
}

export function verifyLicenseCode(
  code: string,
  expectedSubscriberId: string,
  now = new Date(),
): LicenseVerification {
  const normalized = code.trim().replace(/\s/g, '');
  if (!TOKEN_PATTERN.test(normalized)) {
    return { ok: false, error: 'صيغة كود التفعيل غير صحيحة.' };
  }

  const [encodedPayload, encodedSignature] = normalized.split('.');
  let payload: unknown;
  try {
    payload = decodePayload(encodedPayload);
  } catch {
    return { ok: false, error: 'تعذر قراءة بيانات كود التفعيل.' };
  }

  if (!isPayload(payload)) {
    return { ok: false, error: 'بيانات كود التفعيل غير مكتملة.' };
  }
  if (payload.subscriberId !== expectedSubscriberId) {
    return { ok: false, error: 'هذا الكود مرتبط برقم مشترك مختلف.' };
  }
  if (payload.expiresAt && now.getTime() > new Date(payload.expiresAt).getTime()) {
    return { ok: false, error: 'انتهت صلاحية كود التفعيل.' };
  }

  try {
    const publicKey = KEYUTIL.getKey(LICENSE_PUBLIC_KEY);
    const verifier = new KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
    verifier.init(publicKey);
    verifier.updateString(encodedPayload);
    if (!verifier.verify(b64utohex(encodedSignature))) {
      return { ok: false, error: 'التوقيع الرقمي للكود غير صالح.' };
    }
  } catch (error) {
    console.error('License verification error:', error);
    return { ok: false, error: 'تعذر التحقق من كود التفعيل.' };
  }

  return { ok: true, payload };
}

export function planFromLicense(plan: LicensePlan): Exclude<SubscriptionTier, 'free'> {
  switch (plan) {
    case 'MONTHLY': return 'monthly';
    case 'QUARTERLY': return 'quarterly';
    case 'YEARLY': return 'yearly';
    case 'LIFETIME': return 'lifetime';
  }
}

export function calculateSubscriptionExpiry(
  plan: LicensePlan,
  currentExpiryDate: string | undefined,
  now = new Date(),
): string | undefined {
  if (plan === 'LIFETIME') return '2099-12-31T23:59:59.000Z';

  const base = currentExpiryDate
    && new Date(currentExpiryDate).getTime() > now.getTime()
    ? new Date(currentExpiryDate)
    : new Date(now);
  const days = plan === 'MONTHLY' ? 30 : plan === 'QUARTERLY' ? 90 : 365;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

export function subscriptionPlanLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case 'monthly': return 'شهرية';
    case 'quarterly': return 'ربع سنوية';
    case 'yearly': return 'سنوية';
    case 'lifetime': return 'مدى الحياة';
    default: return 'مجانية';
  }
}