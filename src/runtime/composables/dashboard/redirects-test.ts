import { useState, type Ref } from '#imports'

export const usePruviousRedirectsTest: () => Ref<string> = () => useState('pruvious-redirects-test', () => '')
