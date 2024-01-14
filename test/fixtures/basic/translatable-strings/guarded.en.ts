import { defineTranslatableStrings, hasCapability } from '#pruvious'

export default defineTranslatableStrings({
  domain: 'guarded',
  language: 'en',
  strings: {
    foo: 'bar',
  },
  guards: [
    ({ user }) => {
      if (!user) {
        throw new Error('Access denied')
      }
    },
    ({ user }) => {
      if (!hasCapability(user, 'test-capability')) {
        throw new Error('No permission')
      }
    },
  ],
})
