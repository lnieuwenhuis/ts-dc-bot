import { getConnection } from '../utils/initDatabase.js';
import type { Database } from 'sqlite';

export function getDbConnection(): Database {
    return getConnection();
}
