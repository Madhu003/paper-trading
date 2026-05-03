import path from 'path';
import dotenv from 'dotenv';
import { envSummary, startupLog } from './startupLog';

const envPath = path.resolve(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath });
startupLog('env loaded', {
  envPath,
  dotenvError: result.error ? String(result.error.message) : null,
  ...envSummary(),
});
