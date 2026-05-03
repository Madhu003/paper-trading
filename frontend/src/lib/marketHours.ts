/** NSE cash session in India (IST). Mon–Fri 9:15–15:30; holidays not checked. */

const IST = 'Asia/Kolkata'
const OPEN_MIN = 9 * 60 + 15
const CLOSE_MIN = 15 * 60 + 30

function istNow(d: Date) {
  const line = d.toLocaleString('sv-SE', { timeZone: IST })
  const [, time = '0:0:0'] = line.split(' ')
  const [h, m] = time.split(':').map(Number)
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: IST, weekday: 'short' }).format(d)
  return { mins: h * 60 + m, weekday }
}

export function isNseCashSessionOpen(d = new Date()): boolean {
  const { mins, weekday } = istNow(d)
  if (weekday === 'Sat' || weekday === 'Sun') return false
  return mins >= OPEN_MIN && mins <= CLOSE_MIN
}

/** Short line for tooltips (always IST). */
export function formatIstBrief(d = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export const NSE_SESSION_TOOLTIP = 'IST · Mon–Fri · 9:15 am – 3:30 pm (NSE cash).'
