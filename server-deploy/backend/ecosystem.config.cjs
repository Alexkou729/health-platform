/**
 * PM2 进程管理配置（生产环境推荐）
 * 使用方式：
 *   1) 镜像内安装 pm2: npm i -g pm2
 *   2) 启动: pm2 start ecosystem.config.cjs
 *   3) 持久化: pm2 save && pm2 startup
 *
 * 优势：
 *   - 多进程利用多核（instances: max）
 *   - 自动重启（max_memory_restart）
 *   - 集群负载均衡（cluster_mode）
 *   - 0 秒热重载（graceful reload）
 */
module.exports = {
  apps: [
    {
      name: 'health-api',
      script: './dist/main.js',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      max_memory_restart: '1.5G',
      node_args: ['--max-old-space-size=1536'],
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      wait_ready: false,
      listen_timeout: 10000,
      kill_timeout: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      out_file: '/var/log/health-api.out.log',
      error_file: '/var/log/health-api.err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
