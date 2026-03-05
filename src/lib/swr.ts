/**
 * Shared fetcher and cache config for SWR.
 * Cache is reused when switching between dashboard sections (revalidate in background).
 */
const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Default SWR config: cache 2 min, revalidate when tab refocuses after 30s, dedupe 5s */
export const swrConfig = {
  fetcher,
  dedupingInterval: 5_000,
  revalidateOnFocus: true,
  revalidateIfStale: true,
  keepPreviousData: true,
};

export { fetcher };
