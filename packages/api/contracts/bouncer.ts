/**
 * Contract source: https://git.io/Jte3v
 *
 * Feel free to let us know via PR, if you find something broken in this config
 * file.
 */

import { actions, policies } from '../start/bouncer'

declare module '@ioc:Adonis/Addons/Bouncer' {
  type ApplicationActions = ExtractActionsTypes<typeof actions>
  type ApplicationPolicies = ExtractPoliciesTypes<typeof policies>

  interface ActionsList extends ApplicationActions {}
  interface PoliciesList extends ApplicationPolicies {}
}
