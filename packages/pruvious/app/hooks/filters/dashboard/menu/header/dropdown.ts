import { defineFilter } from '#pruvious/app'
import type { DashboardMenuItem } from '../../../../../utils/pruvious/dashboard/menu'

export default defineFilter<Omit<DashboardMenuItem, 'active' | 'submenu'>[][]>()
