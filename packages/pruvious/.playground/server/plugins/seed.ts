import { database } from '#pruvious/server'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hookOnce('request', async () => {
    const qb = database().queryBuilder()
    const existing = await qb.selectFrom('Countries').count()

    if (!existing.success || existing.data > 0) {
      return
    }

    await qb
      .insertInto('Countries')
      .values([
        { code: 'AT', name: 'Austria', capital: 'Vienna' },
        { code: 'BA', name: 'Bosnia and Herzegovina', capital: 'Sarajevo' },
        { code: 'DE', name: 'Germany', capital: 'Berlin' },
        { code: 'FR', name: 'France', capital: 'Paris' },
        { code: 'HR', name: 'Croatia', capital: 'Zagreb' },
        { code: 'IT', name: 'Italy', capital: 'Rome' },
        { code: 'JP', name: 'Japan', capital: 'Tokyo' },
        { code: 'RS', name: 'Serbia', capital: 'Belgrade' },
        { code: 'SI', name: 'Slovenia', capital: 'Ljubljana' },
        { code: 'US', name: 'United States', capital: 'Washington, D.C.' },
      ])
      .run()
  })
})
