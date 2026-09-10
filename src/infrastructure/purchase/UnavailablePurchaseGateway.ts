import type { PurchaseGateway } from '@/application/ports/PurchaseGateway';
import type { Entitlement } from '@/domain/entitlement/Entitlement';

/**
 * The gateway the template runs.
 *
 * Not a stub that throws: for a static, local-first app with no purchase
 * channel this is the **correct** implementation, and it is what an app that
 * never sells anything keeps forever. It performs no network request, which
 * is also what keeps the privacy promise checkable.
 */
export class UnavailablePurchaseGateway implements PurchaseGateway {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async restore(): Promise<Entitlement> {
    return 'free';
  }
}

/**
 * Deterministic gateway for tests.
 *
 * Includes a failure mode on purpose: "the channel threw" is the case that
 * produces the ugliest bugs, and a fake that cannot reproduce it lets them
 * through.
 */
export class FakePurchaseGateway implements PurchaseGateway {
  readonly calls: string[] = [];

  constructor(
    private readonly options: {
      available?: boolean;
      restored?: Entitlement;
      throws?: boolean;
    } = {},
  ) {}

  async isAvailable(): Promise<boolean> {
    this.calls.push('isAvailable');
    if (this.options.throws) throw new Error('no purchase channel');
    return this.options.available ?? false;
  }

  async restore(): Promise<Entitlement> {
    this.calls.push('restore');
    if (this.options.throws) throw new Error('no purchase channel');
    return this.options.restored ?? 'free';
  }
}
