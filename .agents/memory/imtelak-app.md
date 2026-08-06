---
name: إمتلاك App Architecture
description: Key decisions and gotchas for the إمتلاك Arabic RTL Expo property management app.
---

# إمتلاك — Architecture & Gotchas

## Stack
- Expo Router v6 + React Native, offline-first via AsyncStorage
- Single `AppContext` in `artifacts/mobile/context/AppContext.tsx` — all state, CRUD, computed helpers
- Types in `artifacts/mobile/types/index.ts`, helpers in `artifacts/mobile/utils/`
- 4 bottom tabs (dashboard / properties / transactions / tenants); settings and reports are stack screens

## RTL
- `I18nManager.forceRTL(true)` called at module level in `app/_layout.tsx`
- All text uses `textAlign: 'right'`, flex rows reverse as needed manually

## Route Naming (important gotcha)
- `app/settings/index.tsx` → Stack.Screen name **`settings/index`**, navigate with `router.push('/settings')`
- `app/reports/index.tsx` → Stack.Screen name **`reports/index`**, navigate with `router.push('/reports')`
- Screen name = file path (no `/index` stripping); URL path = `/settings` (index stripped)

## Payment type field
- Payment interface uses `amountPaid` (not `amount`) — easy to mix up

## PaymentMethod enum
- Values: `'cash' | 'bank_transfer' | 'cheque'` — note `cheque` not `check`

## Auto rent generation
- AppContext auto-generates current-month RentTransactions on startup for all active contracts
- Also exposed as `generateMonthlyRent()` for manual trigger

## Default seed
- If no currencies in storage, seeds `{ id: 'sar-001', code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س', isBase: true }`

**Why:** Offshore state and pure AsyncStorage was chosen because this is a single-owner offline app; no server needed per the spec.
