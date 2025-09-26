/**
 * Database Configuration and Connection Pool
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'ywstorage.synology.me',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'cheonwoongkim',
    password: process.env.DB_PASSWORD || '0908zxCV!!',
    database: process.env.DB_NAME || 'db',
    charset: 'utf8mb4',
    timezone: '+00:00',
    connectionLimit: 10,
    multipleStatements: true,
    supportBigNumbers: true,
    bigNumberStrings: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Test database connection
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL 데이터베이스 연결 성공:', dbConfig.host);

        // Test query
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('✅ 데이터베이스 쿼리 테스트 성공');

        connection.release();
        return true;
    } catch (error) {
        console.error('❌ 데이터베이스 연결 실패:', error.message);
        return false;
    }
}

/**
 * Execute query with error handling
 */
async function executeQuery(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return { success: true, data: rows };
    } catch (error) {
        console.error('Database query error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Execute transaction
 */
async function executeTransaction(queries) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const results = [];
        for (const query of queries) {
            const [rows] = await connection.execute(query.sql, query.params || []);
            results.push(rows);
        }

        await connection.commit();
        return { success: true, data: results };
    } catch (error) {
        await connection.rollback();
        console.error('Transaction error:', error);
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
    try {
        const queries = [
            'SELECT COUNT(*) as total_loans FROM loan_applications',
            'SELECT workflow_status, COUNT(*) as count FROM loan_applications GROUP BY workflow_status',
            'SELECT COUNT(*) as total_documents FROM uploaded_documents',
            'SELECT COUNT(*) as total_parsing_results FROM document_parsing_results'
        ];

        const results = {};
        for (const query of queries) {
            const [rows] = await pool.execute(query);
            results[query.split(' ')[1]] = rows;
        }

        return { success: true, data: results };
    } catch (error) {
        console.error('Database stats error:', error);
        return { success: false, error: error.message };
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Closing database connection pool...');
    await pool.end();
    process.exit(0);
});

module.exports = {
    pool,
    testConnection,
    executeQuery,
    executeTransaction,
    getDatabaseStats
};