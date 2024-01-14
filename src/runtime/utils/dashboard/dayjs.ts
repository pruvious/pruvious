import dayjs from 'dayjs/esm'
import advancedFormat from 'dayjs/esm/plugin/advancedFormat'
import isoWeek from 'dayjs/esm/plugin/isoWeek'
import localizedFormat from 'dayjs/esm/plugin/localizedFormat'
import timezone from 'dayjs/esm/plugin/timezone'
import utc from 'dayjs/esm/plugin/utc'
import weekOfYear from 'dayjs/esm/plugin/weekOfYear'

dayjs.extend(advancedFormat)
dayjs.extend(isoWeek)
dayjs.extend(localizedFormat)
dayjs.extend(timezone)
dayjs.extend(utc)
dayjs.extend(weekOfYear)

const dayjsUTC: typeof dayjs = dayjs.utc as any

export { dayjs, dayjsUTC }
