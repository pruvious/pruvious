import { isString } from '@pruvious/utils'
import type { ComputedRef, Ref } from 'vue'

export interface UseOverviewSearch {
  /**
   * The reactive search query. Bind the dashboard search input to this ref via `v-model`.
   * Every card on the overview page reads from the same state.
   */
  query: Ref<string>

  /**
   * The lower-cased, whitespace-separated tokens of the current query.
   */
  tokens: ComputedRef<string[]>

  /**
   * `true` when the query contains at least one non-whitespace token.
   */
  active: ComputedRef<boolean>

  /**
   * `true` when at least one registered card reports a visible-results count greater than zero.
   * Used by the page to decide whether to render its "No results" status block.
   */
  hasAnyResults: ComputedRef<boolean>

  /**
   * Returns `true` when the current query is empty, or when every query token appears
   * (case-insensitively) somewhere in the concatenation of the provided haystack strings.
   * Null/undefined/empty haystacks are ignored.
   */
  matches: (...haystacks: (string | null | undefined)[]) => boolean

  /**
   * Reports a card's current visible-results count.
   * Cards should call this in a `watchEffect` so the page-level "No results" detector stays in sync.
   * The `key` must be unique per card and stable across re-renders.
   */
  registerCount: (key: string, count: number) => void

  /**
   * Removes a card's count from the global tally. Call from `onBeforeUnmount`.
   */
  unregisterCount: (key: string) => void
}

/**
 * Shared search state for the dashboard overview page.
 *
 * The overview page renders an input bound to `query`; every overview card reads from the same
 * composable instance and filters its own data via `matches()`. Custom cards can opt in by calling
 * the composable and applying `matches()` to whatever strings should participate in search:
 *
 * @example
 * ```ts
 * const { matches, registerCount, unregisterCount } = useOverviewSearch()
 * const filtered = computed(() =>
 *   entries.value.filter((entry) => matches(entry.title, entry.tag)),
 * )
 * watchEffect(() => registerCount('my-card', filtered.value.length))
 * onBeforeUnmount(() => unregisterCount('my-card'))
 * ```
 */
export function useOverviewSearch(): UseOverviewSearch {
  const query = useState<string>('pruvious-dashboard-overview-search', () => '')
  const counts = useState<Record<string, number>>('pruvious-dashboard-overview-counts', () => ({}))

  const tokens = computed(() => {
    const trimmed = query.value.trim().toLowerCase()
    return trimmed ? trimmed.split(/\s+/).filter(Boolean) : []
  })

  const active = computed(() => tokens.value.length > 0)

  const hasAnyResults = computed(() => Object.values(counts.value).some((n) => n > 0))

  function matches(...haystacks: (string | null | undefined)[]): boolean {
    if (!tokens.value.length) {
      return true
    }
    const combined = haystacks
      .filter((s): s is string => isString(s) && s.length > 0)
      .join(' ')
      .toLowerCase()
    return tokens.value.every((token) => combined.includes(token))
  }

  function registerCount(key: string, count: number) {
    counts.value[key] = count
  }

  function unregisterCount(key: string) {
    delete counts.value[key]
  }

  return { query, tokens, active, hasAnyResults, matches, registerCount, unregisterCount }
}
