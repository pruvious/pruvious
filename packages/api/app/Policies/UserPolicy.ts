import Bouncer, { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'
import User from 'App/Models/User'

export default class UserPolicy extends BasePolicy {
  public async can(user: User, ...capabilities: string[]) {
    if (user.isAdmin) {
      return true
    }

    const combinedCapabilities = await user.getCombinedCapabilities()

    for (const capability of capabilities) {
      if (!combinedCapabilities.includes(capability)) {
        if (capability === 'accessDashboard') {
          return Bouncer.deny('You are not allowed to access the dashboard', 403)
        } else {
          return Bouncer.deny(`Missing capability: '${capability}'`, 403)
        }
      }
    }

    return true
  }
}
