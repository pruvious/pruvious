import type { BlockName, DynamicBlockFieldTypes } from '#pruvious/server'

/**
 * An injection key for providing the current block's data to child components within the block.
 *
 * @example
 * ```vue
 * <template>
 *   <pre>{{ blockData }}</pre>
 * </template>
 *
 * <script lang="ts" setup>
 * import { blockDataInjection } from '#pruvious/app'
 *
 * const blockData = inject(blockDataInjection, undefined)
 * </script>
 * ```
 */
export const blockDataInjection = Symbol() as InjectionKey<
  Ref<DynamicBlockFieldTypes['Populated'][BlockName]> | undefined
>

/**
 * An injection key for providing the current block's name to child components within the block.
 *
 * @example
 * ```vue
 * <template>
 *   <pre>{{ blockName }}</pre>
 * </template>
 *
 * <script lang="ts" setup>
 * import { blockNameInjection } from '#pruvious/app'
 *
 * const blockName = inject(blockNameInjection, undefined)
 * </script>
 * ```
 */
export const blockNameInjection = Symbol() as InjectionKey<Ref<BlockName> | undefined>

/**
 * An injection key for providing the current block's path to child components within the block.
 *
 * @example
 * ```vue
 * <template>
 *   <pre>{{ blockPath }}</pre>
 * </template>
 *
 * <script lang="ts" setup>
 * import { blockPathInjection } from '#pruvious/app'
 *
 * const blockPath = inject(blockPathInjection, undefined)
 * </script>
 * ```
 */
export const blockPathInjection = Symbol() as InjectionKey<Ref<string | undefined> | undefined>

/**
 * An injection key for providing the nearest prose list item block path to child components within the block.
 *
 * This enables special live editing features for list item blocks and their editable fields.
 *
 * @example
 * ```vue
 * <template>
 *   <li>
 *     <PruviousBlocks field="content" />
 *   </li>
 * </template>
 *
 * <script lang="ts" setup>
 * import { blockPathInjection, blocksField, defineBlock, proseListItemBlockPathInjection } from '#pruvious/app'
 *
 * defineBlock({
 *   ui: {
 *     icon: 'text-wrap-disabled',
 *     label: ({ __ }) => __('pruvious-dashboard', 'List item'),
 *   },
 * })
 *
 * defineProps({
 *   content: blocksField({
 *     allowRootBlocks: ['ProseNode', 'ProseList'],
 *     default: [{ $key: 'ProseNode', tag: 'p', text: '' }],
 *     ui: { label: ({ __ }) => __('pruvious-dashboard', 'Content') },
 *   }),
 * })
 *
 * provide(proseListItemBlockPathInjection, inject(blockPathInjection))
 * </script>
 * ```
 */
export const proseListItemBlockPathInjection = Symbol() as InjectionKey<Ref<string | undefined> | undefined>

/**
 * An injection key signalling that the current subtree was inlined from a `linkedBlocksField`
 * (for example, blocks contributed by a `Pattern` block).
 *
 * Editable text and similar live-edit components should treat the subtree as read-only when this
 * injection resolves to `true`, since the source of truth lives in the linked record - editing it
 * from the parent collection would silently write to the wrong place.
 */
export const inLinkedBlocksInjection = Symbol() as InjectionKey<boolean>

/**
 * An injection key providing the path and name of the block whose `linkedBlocksField` contributed
 * the current subtree (e.g. a `Pattern` block at `blocks.3`). Descendant blocks tag their DOM root
 * with `data-block-path-alias` / `data-block-name-alias` so the dashboard's iframe block tracker
 * can resolve hovers, clicks, and tree-to-iframe scrolls to the owning block instead of the
 * (uneditable) inner block.
 */
export const linkedBlocksRootInjection = Symbol() as InjectionKey<Ref<{ path: string; name: BlockName }> | undefined>
