import YahooFinance from 'yahoo-finance2';

/** v3+ requires a class instance; share one process-wide. */
export const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
});
