import parser from 'accept-language-parser'
import { defineEventHandler, getHeader } from 'h3'
import { getModuleOption } from '../../instances/state'

export default defineEventHandler((event) => {
  const options = getModuleOption('language')
  const supported = options.supported.map(({ code }) => code)

  if (supported.length > 1) {
    const accept = getHeader(event, 'Accept-Language') ?? ''
    const language = parser.pick(supported, accept, { loose: true })

    event.context.language = language || (options.primary as any)
  } else {
    event.context.language = options.primary as any
  }
})
