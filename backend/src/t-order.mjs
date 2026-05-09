import './loadEnv.js';
import { pool } from './db.js';
console.log('GEMINI', process.env.GEMINI_API_KEY);
unlinkSync(new URL('./t-order.mjs', import.meta.url));
