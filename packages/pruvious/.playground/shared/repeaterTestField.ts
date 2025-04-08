import { numberField, repeaterField, resolvePruviousComponent, textField } from '#pruvious/server'

export function repeaterTestField() {
  return repeaterField({
    subfields: {
      type: textField({
        default: 'text',
        ui: { customComponent: resolvePruviousComponent('@/components/dashboard/RepeaterTypeTest.vue') },
      }),
      text: textField({ required: true, default: 'foo', conditionalLogic: { type: { '=': 'text' } } }),
      number: numberField({ required: true, default: 1337, conditionalLogic: { type: { '=': 'number' } } }),
    },
    ui: {
      label: 'Repeater',
      subfieldsLayout: [{ row: ['type | auto', 'text', 'number'] }],
    },
  })
}
