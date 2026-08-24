# PostgreSQL 初始化脚本
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 创建只读用户（可选）
-- CREATE USER health_readonly WITH PASSWORD 'readonly123';
-- GRANT CONNECT ON DATABASE health_platform TO health_readonly;

-- 设置时区
SET timezone = 'Asia/Shanghai';
