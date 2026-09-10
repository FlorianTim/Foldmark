import { describe, expect, it } from 'vitest';
import { EntitlementService } from '@/application/usecases/EntitlementService';
import {
  entitlementFromStored,
  isFeatureUnlocked,
  isPro,
  type Entitlement,
} from '@/domain/entitlement/Entitlement';
import {
  FakePurchaseGateway,
  UnavailablePurchaseGateway,
} from '@/infrastructure/purchase/UnavailablePurchaseGateway';

function cache(initial: string | null = null) {
  const state = { entitlement: initial, checkedAt: null as string | null };
  return {
    state,
    read: () => state.entitlement,
    write: (entitlement: string, checkedAt: string) => {
      state.entitlement = entitlement;
      state.checkedAt = checkedAt;
      return true;
    },
  };
}

describe('entitlement domain', () => {
  it('degrades every unknown value to free', () => {
    for (const raw of ['', 'pro', 'PRO-LIFETIME', null, undefined, '1']) {
      expect(entitlementFromStored(raw)).toBe('free');
    }
  });

  it('reads the stable strings', () => {
    expect(entitlementFromStored('pro-lifetime')).toBe('pro-lifetime');
    expect(entitlementFromStored('pro-subscription')).toBe('pro-subscription');
  });

  it('treats any paid entitlement as Pro', () => {
    expect(isPro('free')).toBe(false);
    expect(isPro('pro-lifetime')).toBe(true);
    expect(isPro('pro-subscription')).toBe(true);
  });
});

describe('feature gates', () => {
  it('gates nothing with the shipped catalogue', () => {
    // The template must not teach a derived app that one of its features is
    // paid.
    expect(isFeatureUnlocked('anything', 'free')).toBe(true);
  });

  it('follows the entitlement for a gated key', () => {
    const gates = { 'export.pdf': 'pro-lifetime' as Entitlement };
    expect(isFeatureUnlocked('export.pdf', 'free', gates)).toBe(false);
    expect(isFeatureUnlocked('export.pdf', 'pro-lifetime', gates)).toBe(true);
  });

  it('leaves an unknown key unlocked even with a catalogue', () => {
    // Fail-open: a typo must never lock somebody out of a core feature.
    const gates = { 'export.pdf': 'pro-lifetime' as Entitlement };
    expect(isFeatureUnlocked('export.pfd', 'free', gates)).toBe(true);
  });
});

describe('the default gateway', () => {
  it('reports no channel and never throws', async () => {
    const gateway = new UnavailablePurchaseGateway();
    await expect(gateway.isAvailable()).resolves.toBe(false);
    await expect(gateway.restore()).resolves.toBe('free');
  });
});

describe('EntitlementService', () => {
  it('reports availability from the gateway', async () => {
    const service = new EntitlementService(new FakePurchaseGateway({ available: true }), cache());
    await expect(service.isPurchaseAvailable()).resolves.toBe(true);
  });

  it('degrades to unavailable when the gateway throws', async () => {
    const service = new EntitlementService(new FakePurchaseGateway({ throws: true }), cache());
    await expect(service.isPurchaseAvailable()).resolves.toBe(false);
  });

  it('does not touch the channel just to read the cached entitlement', () => {
    const gateway = new FakePurchaseGateway();
    const service = new EntitlementService(gateway, cache('pro-lifetime'));

    expect(service.current()).toBe('pro-lifetime');
    expect(gateway.calls).toEqual([]);
  });

  it('writes entitlement and timestamp together on a restore', async () => {
    const store = cache();
    const service = new EntitlementService(
      new FakePurchaseGateway({ restored: 'pro-lifetime' }),
      store,
      undefined,
      () => new Date('2026-08-26T12:00:00.000Z'),
    );

    await expect(service.restore()).resolves.toBe('restored');
    expect(store.state.entitlement).toBe('pro-lifetime');
    expect(store.state.checkedAt).toBe('2026-08-26T12:00:00.000Z');
  });

  it('reports nothing to restore without touching the cache', async () => {
    const store = cache();
    const service = new EntitlementService(new FakePurchaseGateway(), store);

    await expect(service.restore()).resolves.toBe('nothing');
    expect(store.state.entitlement).toBeNull();
  });

  it('never downgrades the cache when the channel fails', async () => {
    const store = cache('pro-lifetime');
    const service = new EntitlementService(new FakePurchaseGateway({ throws: true }), store);

    await expect(service.restore()).resolves.toBe('unavailable');
    expect(store.state.entitlement).toBe('pro-lifetime');
  });

  it('answers the gate question without exposing the entitlement', () => {
    const service = new EntitlementService(new FakePurchaseGateway(), cache('free'), {
      'export.pdf': 'pro-lifetime',
    });

    expect(service.isUnlocked('export.pdf')).toBe(false);
    expect(service.isUnlocked('anything.else')).toBe(true);
  });
});
