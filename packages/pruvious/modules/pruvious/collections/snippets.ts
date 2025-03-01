/**
 * Generates the base content for a collection definition file.
 * This includes essential imports and a minimal collection structure.
 */
export function collectionSnippet(): string {
  return [
    `import { createdAtField, defineCollection, textField, updatedAtField } from '#pruvious/server'`,
    ``,
    `export default defineCollection({`,
    `  fields: {`,
    `    exampleField: textField({}),`,
    `    createdAt: createdAtField(),`,
    `    updatedAt: updatedAtField(),`,
    `  },`,
    `})`,
    ``,
  ].join('\n')
}

/**
 * Generates a comprehensive collection definition file with practical examples.
 */
export function collectionExampleSnippet(): string {
  return [
    `import { createdAtField, defineCollection, textField, updatedAtField } from '#pruvious/server'`,
    ``,
    `export default defineCollection({`,
    `  fields: {`,
    //   @todo
    `    createdAt: createdAtField(),`,
    `    updatedAt: updatedAtField(),`,
    `  },`,
    `})`,
    ``,
  ].join('\n')
}
