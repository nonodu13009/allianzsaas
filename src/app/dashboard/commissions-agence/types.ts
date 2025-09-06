export type CommissionBreakdown = {
  iard: number;
  vie: number;
  courtage: number;
  profitsExceptionnels: number;
};

export type MonthData = {
  month: number; // 1-12
  commissions: CommissionBreakdown;
  charges: number;
  prelevements: Record<string, number>; // { Julien: number; "Jean-Michel": number }
  completed: boolean;
};

export type YearData = {
  year: number;
  months: Record<number, MonthData>; // 1..12
};

export function calculateTotalCommissions(c: CommissionBreakdown): number {
  return (c.iard || 0) + (c.vie || 0) + (c.courtage || 0) + (c.profitsExceptionnels || 0);
}

export function calculateResult(month: MonthData): number {
  return calculateTotalCommissions(month.commissions) - (month.charges || 0);
}


