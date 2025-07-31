import { getConnection } from '../utils/initDatabase.js';
import mysql from 'mysql2/promise';

export function getDbConnection(): mysql.Connection {
    return getConnection();
}