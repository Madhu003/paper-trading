import path from 'path';
import dotenv from 'dotenv';
import { envSummary, startupLog } from './startupLog';

const envPath = path.resolve(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath });

const summary = envSummary();
startupLog('env loaded', {
  ...summary,
  envPath, // Explicit override of the default path if needed
  dotenvError: result.error ? String(result.error.message) : null,
});
