module.exports = {
  apps: [
    {
      name: 'pop-backend',
      cwd: './backend',
      script: 'src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './backend/logs/pm2-error.log',
      out_file: './backend/logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
    // Phase 3 will add a dedicated worker process for BullMQ scheduled messages:
    // {
    //   name: 'pop-scheduler-worker',
    //   cwd: './backend',
    //   script: 'src/workers/scheduledMessage.worker.js',
    //   instances: 1,
    //   exec_mode: 'fork',
    // },
  ],
};
