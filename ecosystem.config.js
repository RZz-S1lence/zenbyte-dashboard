module.exports = {
  apps: [{
    name: 'zenbyte',
    script: './bot.js',
    // cwd defaults to this file's folder, so the same config works on Windows and Linux.
    interpreter: 'node',
    exec_mode: 'fork',
    autorestart: true,
    stop_exit_codes: [],
    env: { NODE_ENV: 'production' },
    min_uptime: '10s',
    max_restarts: 10,
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    merge_logs: true,
    restart_delay: 3000,
    kill_timeout: 5000,
    listen_timeout: 10000,
    node_args: []
  }]
};
