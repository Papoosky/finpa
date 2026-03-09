import { useMemo } from 'react';

export function useDateRange(viewMode: 'month' | 'year', month: number, year: number) {
  return useMemo(() => {
    if (viewMode === 'month') {
      const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { dateFrom, dateTo };
    }
    return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
  }, [viewMode, month, year]);
}
