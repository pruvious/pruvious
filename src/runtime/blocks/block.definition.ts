import type { BlockName, Field, PruviousIcon } from '#pruvious'

export interface BlockDefinition {
  /**
   * A unique block name.
   *
   * The name must consist of alphanumeric characters where each word starts with an uppercase letter
   * and has no spaces or special characters.
   *
   * Examples: 'Slider', 'Button', 'ButtonGroup', etc.
   *
   * Defaults to the Vue block component name.
   */
  name: string

  /**
   * The block label displayed in the block picker within the dashboard.
   *
   * If not provided, the label is auto-generated from the block name (e.g., 'IconBox' => 'Icon box').
   */
  label: string

  /**
   * The block icon displayed in the block picker within the dashboard.
   *
   * @default 'Components'
   */
  icon?: PruviousIcon

  /**
   * Fields used in the block.
   *
   * Field names should follow camel-case formatting.
   *
   * @example
   * ```typescript
   * defineBlock({
   *   name: 'Button',
   *   fields: {
   *     link: { type: 'link', options: { required: true } },
   *   },
   * })
   * ```
   */
  fields: Record<string, Field>

  /**
   * A key-value map of slot names and their allowed child blocks.
   *
   * @example
   * ```typescript
   * defineBlock({
   *   name: 'Prose',
   *   slots: {
   *     default: {
   *       label: _('Content'),
   *       allowedChildBlocks: ['Heading', 'Paragraph', 'Button'],
   *     },
   *   },
   * })
   * ```
   */
  slots: Record<string, Slot>

  /**
   * A brief description of the block displayed in the block picker within the dashboard.
   */
  description?: string
}

export interface Slot {
  /**
   * The label for the slot, displayed in the block picker within the dashboard.
   * If not provided, the label is auto-generated from the slot name (e.g., 'default' => 'Default').
   */
  label?: string

  /**
   * An array of allowed child blocks for the slot.
   * If not provided, all blocks are allowed.
   */
  allowedChildBlocks?: BlockName[] | '*'
}

/**
 * Vue `<script setup>` compiler macro for defining block options.
 * This function is compiled away when the component is processed.
 *
 * Note: Fields declared in `defineProps()` will
 *
 * @example
 * ```typescript
 * defineBlock({
 *   description: 'An image gallery with cool zoom effects.',
 *   slots: {
 *     allowedChildBlocks: ['Image'],
 *   },
 * })
 * ```
 */
export function defineBlock(options: Partial<Omit<BlockDefinition, 'name'>>) {}
