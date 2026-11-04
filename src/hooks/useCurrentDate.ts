import { useEffect, useState } from 'react';
import { addDays, startOfDay } from 'date-fns';

/**
 * The current date, stable between renders and refreshed just after local midnight, so views
 * left open overnight move on to the new day. Use instead of `new Date()` during render.
 */
export function useCurrentDate(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const nextMidnight = startOfDay(addDays(now, 1));
    // +1 s margin so the new date is safely past midnight when the timer fires.
    const timer = setTimeout(() => setNow(new Date()), nextMidnight.getTime() - Date.now() + 1000);
    return () => clearTimeout(timer);
  }, [now]);

  return now;
}
