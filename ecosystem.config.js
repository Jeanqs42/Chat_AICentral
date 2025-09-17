module.exports = {
  apps: [{
    name: 'whatsapp-multi-user',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3004
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3004
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=2048',
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      '.wwebjs_auth',
      '.wwebjs_cache',
      'session'
    ],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};