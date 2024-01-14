import type { BlockName } from '#pruvious'

export interface LayoutDefinition {
  /**
   * A unique layout name.
   *
   * Examples: 'default', 'documentation', 'sidebar-right', etc.
   *
   * Defaults to the Vue layout component name.
   */
  name: string

  /**
   * A label displayed in the layout picker within the dashboard.
   *
   * If not specified, the layout label is auto-generated from the Vue component name.
   */
  label: string

  /**
   * An array of allowed blocks for the layout.
   * If not specified, all blocks are allowed.
   */
  allowedBlocks?: BlockName[] | '*'

  /**
   * An array of allowed top-level blocks for the layout.
   * If not specified, all `allowedBlocks` can be used as root blocks.
   */
  allowedRootBlocks?: BlockName[] | '*'
}

/**
 * Vue `<script setup>` compiler macro for defining layout options.
 * This function is compiled away when the compone
 *
 * @example
 * ```typescript
 * defineLayout({
 *   label: 'Documentation',
 *   allowedBlocks: ['Prose', 'Heading', 'Paragraph', 'Button'],
 *   allowedRootBlocks: ['Prose'],
 * })
 * ```
 */
export function defineLayout(options: Partial<Omit<LayoutDefinition, 'name'>>) {}
