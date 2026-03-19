// En el servidor, ejecutar: pm2 start ecosystem.config.js --env production
// O reiniciar: pm2 restart ecosystem.config.js --env production
module.exports = {
    apps: [{
        name: 'transportation-backend',
        script: 'server.js',
        interpreter: 'node',
        instances: 1,
        autorestart: true,
        port: 5000,
        watch: true,
        max_memory_restart: '100M',
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production',
            DB_HOST: '100.24.31.252',
            DB_PORT: '5432',
            DB_NAME: 'transportation_db',
            DB_USER: 'postgres',
            DB_PASSWORD: 'abcd1234!',
        }
    }]
};