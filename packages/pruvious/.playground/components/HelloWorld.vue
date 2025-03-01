<template>
  <div>
    <h1>Hello World</h1>
    <p>{{ buttonGroup }}</p>
    <p>{{ chips }}</p>
    <p>{{ records[0]?.roles[0]?.permissions }}</p>
    <ul>
      <li v-for="{ sub, records, repeater } in repeater">
        {{ sub }}
        {{ records[0]?.tokenSubject }}
        {{ records[0]?.roles[0]?.permissions }}
        {{ repeater[0]?.records[0]?.roles[0]?.permissions }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { buttonGroupField, chipsField, recordsField, repeaterField, textField } from '#pruvious/client'

defineProps({
  text: textField({ required: true }),
  buttonGroup: buttonGroupField({ choices: [{ label: 'a', value: 'a' }, { value: 'b' }] }),
  chips: chipsField({ allowValues: ['a', 'b', 'c'], default: ['a', 'b'] }),
  records: recordsField({ collection: 'Users', fields: ['roles', 'tokenSubject'], populate: true }),
  repeater: repeaterField({
    subfields: {
      sub: textField({ required: true }),
      records: recordsField({ collection: 'Users', fields: ['roles', 'tokenSubject'], populate: true }),
      repeater: repeaterField({
        subfields: {
          sub: textField({ required: true }),
          records: recordsField({
            collection: 'Users',
            fields: ['roles', 'tokenSubject'],
            populate: true,
          }),
        },
      }),
    },
  }),
})
</script>
