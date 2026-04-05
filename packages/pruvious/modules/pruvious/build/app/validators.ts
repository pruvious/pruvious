import { validatorsMeta } from '@pruvious/orm'
import { useNuxt } from 'nuxt/kit'
import { getSimpleValidatorsMeta } from '../utils'

/**
 * Generates the `#pruvious/app/validators.ts` file content.
 */
export function getAppValidatorsFileContent() {
  const nuxt = useNuxt()

  const simpleValidatorsMeta = getSimpleValidatorsMeta()

  return [
    ...(nuxt.options.runtimeConfig._tsCheckPruvious ? [] : [`// @ts-nocheck`]),
    `const _validatorFn: any = () => null`,
    ...simpleValidatorsMeta.flatMap(({ name, comment, exampleField }) => [
      ``,
      `import type { ${name}Validator as _${name}Validator } from '@pruvious/orm'`,
      ``,
      `/**`,
      ...comment.map((line) => ` * ${line}`),
      ` *`,
      ` * This validator should only be used within the \`validators\` array when defining block fields.`,
      ` * The imported function is a meta function that does not execute any actual validation logic.`,
      ` * The real validation is performed on the server side and \`${name}Validator\` is removed from the Vue component during compilation.`,
      ` *`,
      ` * @example`,
      ` * \`\`\`vue`,
      ` * <script lang="ts" setup>`,
      ` * import { ${exampleField}, ${name}Validator } from '#pruvious/app'`,
      ` *`,
      ` * defineProps({`,
      ` *   foo: ${exampleField}({`,
      ` *     validators: [${name}Validator()],`,
      ` *   }),`,
      ` * })`,
      ` * </script>`,
      ` * \`\`\``,
      ` */`,
      `export const ${name}Validator: typeof _${name}Validator = _validatorFn`,
    ]),
    ``,
    `import type { uniqueValidator as _uniqueValidator, UniqueValidatorOptions, GenericCollection, GenericValidator } from '@pruvious/orm'`,
    `import type { GenericDatabase } from '../server'`,
    ``,
    `/**`,
    ...validatorsMeta.find(({ name }) => name === 'unique')!.comment.map((line) => ` * ${line}`),
    ` *`,
    ` * This validator should only be used within the \`validators\` array when defining **repeater** fields in blocks.`,
    ` * The imported function is a meta function that does not execute any actual validation logic.`,
    ` * The real validation is performed on the server side and \`uniqueValidator\` is removed from the Vue component during compilation.`,
    ` *`,
    ` * Alternatively, you can use the \`unique\` option on the field itself, which will automatically add this validator.`,
    ` *`,
    ` * @example`,
    ` * \`\`\`ts`,
    ` * <script lang="ts" setup>`,
    ` * import { repeaterField, textField, uniqueValidator } from '#pruvious/app'`,
    ` *`,
    ` * defineProps({`,
    ` *   variants: repeaterField({`,
    ` *     subfields: {`,
    ` *       name: textField({`,
    ` *         required: true,`,
    ` *         validators: [uniqueValidator()],`,
    ` *       }),`,
    ` *     },`,
    ` *   }),`,
    ` * })`,
    ` * </script>`,
    ` * \`\`\``,
    ` */`,
    `export const uniqueValidator: <TCollection extends GenericCollection, TField extends string = TCollection['TColumnNames']>(options?: UniqueValidatorOptions<TField, GenericDatabase>) => GenericValidator = _validatorFn`,
    ``,
  ].join('\n')
}
