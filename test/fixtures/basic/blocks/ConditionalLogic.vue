<template></template>

<script lang="ts" setup>
import { checkboxField, isString, textField } from '#pruvious'

defineProps({
  foo: checkboxField({}),
  bar: textField(
    { required: true },
    {
      conditionalLogic: { foo: true },
      sanitizers: [({ value }) => (isString(value) ? value.toLowerCase() : value)],
      validators: [
        ({ value }) => {
          if (value !== 'bar') {
            throw new Error('Must be bar')
          }
        },
      ],
      population: {
        type: { js: 'string', ts: "'bar!'" },
        populator: ({ value }) => (value === 'bar' ? 'bar!' : value),
      },
    },
  ),
  baz: textField(
    { required: true },
    {
      conditionalLogic: { foo: false },
      sanitizers: [({ value }) => (isString(value) ? value.toLowerCase() : value)],
      validators: [
        ({ value }) => {
          if (value !== 'baz') {
            throw new Error('Must be baz')
          }
        },
      ],
      population: {
        type: { js: 'string', ts: "'baz!'" },
        populator: ({ value }) => (value === 'baz' ? 'baz!' : value),
      },
    },
  ),
})
</script>
