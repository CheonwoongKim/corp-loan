/**
 * Corp-Loan API Server
 * AI-based Corporate Loan Underwriting System
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import configurations
const { testConnection } = require('./config/database');
const { initializeS3 } = require('./config/s3');

// Import routes
const loanRoutes = require('./routes/loans');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression middleware
app.use(compression());

// CORS configuration - Allow multiple origins for development
const allowedOrigins = [
    'http://localhost:8002',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://localhost:5173'  // Vite default port
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn('⚠️ CORS blocked origin:', origin);
            callback(null, true); // Allow all origins in development
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/loans', loanRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        const dbStatus = await testConnection();

        // Test S3 connection
        const s3Status = await initializeS3();

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                database: dbStatus ? 'connected' : 'disconnected',
                storage: s3Status ? 'connected' : 'disconnected'
            },
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0'
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Service health check failed',
            timestamp: new Date().toISOString()
        });
    }
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Corp-Loan API',
        version: '1.0.0',
        description: 'AI-based Corporate Loan Underwriting System API',
        endpoints: {
            'GET /api/health': 'System health check',
            'GET /api/loans': 'Get all loan applications',
            'POST /api/loans': 'Create new loan application',
            'GET /api/loans/:id': 'Get specific loan application',
            'PUT /api/loans/:id': 'Update loan application',
            'DELETE /api/loans/:id': 'Delete loan application',
            'POST /api/loans/:id/documents': 'Upload documents for loan',
            'GET /api/loans/:id/workflow': 'Get workflow status',
            'POST /api/loans/:id/workflow/advance': 'Advance workflow stage'
        },
        documentation: 'Refer to PRD.md for detailed API specifications'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    // Multer file upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: '파일 크기가 너무 큽니다. 최대 50MB까지 업로드 가능합니다.',
            error: 'FILE_TOO_LARGE'
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: '예상하지 못한 파일 필드입니다.',
            error: 'UNEXPECTED_FILE'
        });
    }

    // Database errors
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message: '중복된 데이터입니다.',
            error: 'DUPLICATE_ENTRY'
        });
    }

    // Validation errors
    if (err.isJoi) {
        return res.status(400).json({
            success: false,
            message: '입력 데이터가 올바르지 않습니다.',
            errors: err.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || '서버 내부 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? err.stack : 'INTERNAL_SERVER_ERROR'
    });
});

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API 엔드포인트를 찾을 수 없습니다.',
        error: 'NOT_FOUND',
        path: req.originalUrl
    });
});

// Initialize services and start server
async function startServer() {
    try {
        console.log('🚀 Corp-Loan API Server 시작 중...');

        // Test database connection
        console.log('📊 데이터베이스 연결 테스트 중...');
        const dbConnected = await testConnection();
        if (!dbConnected) {
            throw new Error('데이터베이스 연결에 실패했습니다.');
        }

        // Initialize S3 storage
        console.log('📁 S3 스토리지 초기화 중...');
        const s3Initialized = await initializeS3();
        if (!s3Initialized) {
            console.warn('⚠️  S3 스토리지 초기화에 실패했지만 서버를 계속 시작합니다.');
        }

        // Start HTTP server
        const server = app.listen(PORT, () => {
            console.log('✅ 서버가 성공적으로 시작되었습니다!');
            console.log(`🌐 서버 주소: http://localhost:${PORT}`);
            console.log(`📚 API 문서: http://localhost:${PORT}/api`);
            console.log(`💚 헬스 체크: http://localhost:${PORT}/api/health`);
            console.log(`🔧 환경: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown handling
        const gracefulShutdown = (signal) => {
            console.log(`\n${signal} 신호를 받았습니다. 서버를 종료합니다...`);
            server.close(() => {
                console.log('✅ HTTP 서버가 종료되었습니다.');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('❌ 서버 시작 실패:', error.message);
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = app;