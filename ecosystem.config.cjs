// ── PM2 — Configuración de proceso para producción ────────────────
//
// Instalación:
//   npm install -g pm2
//
// Comandos:
//   pm2 start ecosystem.config.cjs --env production   # iniciar
//   pm2 stop cardio-backend                           # detener
//   pm2 restart cardio-backend                        # reiniciar
//   pm2 logs cardio-backend                           # ver logs
//   pm2 monit                                         # monitor en tiempo real
//   pm2 startup                                       # auto-arranque al reiniciar el servidor
//   pm2 save                                          # guardar configuración

module.exports = {
  apps: [
    {
      name: 'medicina-ia-backend',
      script: 'server.js',

      // Reiniciar automáticamente si el proceso cae
      autorestart: true,
      watch: false,

      // Reiniciar si consume más de 500MB (posible memory leak)
      max_memory_restart: '500M',

      // Reintentos al arrancar
      max_restarts: 10,
      min_uptime: '10s',

      // Variables de entorno de producción
      env_production: {
        NODE_ENV: 'production',
      },

      // Logs — instalar rotación automática con: pm2 install pm2-logrotate
      // Configurar: pm2 set pm2-logrotate:max_size 50M
      //             pm2 set pm2-logrotate:retain 7
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
}
