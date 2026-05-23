import { parseBody, populateRelURL, translateRelURL, type LanguageCode } from '#pruvious/server'

export default defineEventHandler(async (event) => {
  const input = await parseBody(event, 'object').then(({ input }) => input)

  if (input.op === 'translate') {
    return { result: await translateRelURL(input.url, input.targetLanguage as LanguageCode) }
  }

  return { result: await populateRelURL(input.url) }
})
