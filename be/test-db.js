const mysql = require('mysql2');
require('dotenv').config();

mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
}).getConnection((err, conn) => {
  if (err) console.error('❌ LỖI:', err.message);
  else { console.log('✅ Kết nối OK!'); conn.release(); }
});
