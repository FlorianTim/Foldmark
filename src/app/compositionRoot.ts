import { appConfig } from '@/config';
import { EntitlementService } from '@/application/usecases/EntitlementService';
import { TodoService } from '@/application/usecases/TodoService';
import { AppDb } from '@/infrastructure/db/AppDb';
import { DexieTodoRepository } from '@/infrastructure/db/DexieTodoRepository';
import { UnavailablePurchaseGateway } from '@/infrastructure/purchase/UnavailablePurchaseGateway';
import { appSettings, readSetting, writeSetting } from '@/presentation/settings/settingsRegistry';

const db = new AppDb(`${appConfig.slug}-db`);

/**
 * The entitlement cache, backed by the settings registry.
 *
 * The service takes this as a port rather than reaching for browser storage
 * itself, so it stays testable without a DOM — and so the two keys are
 * always written together.
 */
const entitlementCache = {
  read: (): string | null => readSetting(appSettings.entitlement),
  write: (entitlement: string, checkedAt: string): boolean =>
    writeSetting(appSettings.entitlement, entitlement as never) &&
    writeSetting(appSettings.entitlementCheckedAt, checkedAt),
};

/** Application services wired to concrete browser adapters in one composition root. */
export const services = {
  todo: new TodoService(new DexieTodoRepository(db)),
  /**
   * The purchase gateway is the store-less default (see ADR on the purchase
   * seam). Swapping in a real channel is one line here plus one adapter —
   * no call site changes, because views ask `isUnlocked(key)` and nothing
   * else.
   */
  entitlement: new EntitlementService(new UnavailablePurchaseGateway(), entitlementCache),
} as const;
