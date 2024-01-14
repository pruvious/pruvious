import { clearRedirects } from '../../../instances/redirects'
import { defineHook } from '../../hook.definition'

export default defineHook('redirects', 'afterUpdate', () => {
  clearRedirects()
})
