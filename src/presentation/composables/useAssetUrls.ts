import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { services } from '@/app/compositionRoot';

/**
 * Object URLs for locally stored artwork.
 *
 * Images live in IndexedDB as blobs, and an `<img>` needs a URL. Creating one
 * is easy; **revoking** it is what this composable exists for. An object URL
 * pins its blob in memory until it is released, so a preview that recreated
 * them on every keystroke and never revoked would hold every version of every
 * image the user touched.
 *
 * URLs are cached per asset id and revoked when the set changes or the scope is
 * disposed, so switching documents releases the previous document's artwork.
 */
export function useAssetUrls(
  assetIds: Ref<readonly string[]>,
): Ref<Readonly<Record<string, string>>> {
  const urls = ref<Record<string, string>>({});

  function revoke(ids: readonly string[]): void {
    for (const id of ids) {
      const url = urls.value[id];
      if (url) {
        URL.revokeObjectURL(url);
        delete urls.value[id];
      }
    }
  }

  watch(
    assetIds,
    async (next) => {
      const wanted = new Set(next);
      revoke(Object.keys(urls.value).filter((id) => !wanted.has(id)));

      for (const id of wanted) {
        if (urls.value[id]) continue;
        const data = await services.assets.data(id);
        // A second check after the await: the document may have changed while
        // the blob was being read, and creating a URL nothing wants leaks it.
        if (data && assetIds.value.includes(id) && !urls.value[id]) {
          urls.value[id] = URL.createObjectURL(data);
        }
      }
    },
    { immediate: true, deep: true },
  );

  onScopeDispose(() => revoke(Object.keys(urls.value)));

  return urls;
}
