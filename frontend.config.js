module.exports = {
  apps: [{
    name: 'whatsapp-frontend',
    script: 'npm',
    args: 'run preview -- --host 0.0.0.0 --port 4173',
    cwd: '/root/Chat_AICentral/client',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/frontend-err.log',
    out_file: './logs/frontend-out.log',
    log_file: './logs/frontend-combined.log',
    time: true,
    max_memory_restart: '500M',
    watch: false,
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};