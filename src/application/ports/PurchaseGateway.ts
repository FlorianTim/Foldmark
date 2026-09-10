import type { Entitlement } from '@/domain/entitlement/Entitlement';

/**
 * Where a paid entitlement comes from, behind an app-owned port.
 *
 * A static, local-first web app has no store. That is exactly why the port
 * ships and the implementation does not: the part that is expensive to
 * retrofit is the **shape** — a port app code depends on, a cache that
 * degrades safely, and a single question (`isFeatureUnlocked`) that call
 * sites ask. An app that skipped the shape and wired a payment SDK straight
 * into a component cannot fix that without touching every call site.
 *
 * Two calls, both triggered by an explicit user action. No subscription
 * stream, no webhook handling, no receipt storage — those only mean
 * something once money actually changes hands, and shipping them now would
 * be untested surface a real adapter would have to match.
 */
export interface PurchaseGateway {
  /**
   * Whether a purchase channel is reachable at all.
   *
   * Called only when the visitor opens the Pro view — never during startup.
   * A network call in the boot path is how a static app starts hanging on a
   * blocked connection.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Asks the channel for an entitlement the visitor already holds.
   *
   * Returns what it reports, or `free` when it reports nothing.
   * Implementations must not throw for "no channel" — that is an expected
   * answer, not an error.
   */
  restore(): Promise<Entitlement>;
}
