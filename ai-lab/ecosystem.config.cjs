module.exports = {
  apps: [
    {
      name: "pc-shop-ai-lab",
      script: "scripts/chat-service.js",
      cwd: __dirname,
      interpreter: "node",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        AI_LAB_HOST: "127.0.0.1",
        AI_LAB_PORT: "4001",
        LOCAL_EMBEDDING: "1",
      },
    },
  ],
};
