import { defineFilter } from '#pruvious/app'
import type { DashboardMenuItem } from '#pruvious/dashboard'

export default defineFilter<Omit<DashboardMenuItem, 'active' | 'submenu'>[][]>()
