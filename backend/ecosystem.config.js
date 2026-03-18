module.exports = {
    apps: [{
        name: 'transportation-backend',
        script: 'server.js',
        interpreter: 'node',
        instances: 1,
        autorestart: true,
        port: 5000,
        watch: false,
        max_memory_restart: '100M',
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production',
            DB_NAME: 'transportation_db',
            DB_USER: 'postgres',
            DB_PASSWORD: 'abcd1234!',
        }
    }]
};