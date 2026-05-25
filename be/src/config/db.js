const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:     process.env.DB_HOST || 'localhost',
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    port:     Number(process.env.DB_PORT) || 3306,
    charset:  'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const ensureStaffRole = async (conn) => {
    try {
        const [columns] = await conn.query(
            `SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users'
               AND COLUMN_NAME = 'role'`
        );
        const roleColumn = columns[0];
        if (!roleColumn?.COLUMN_TYPE?.startsWith('enum(')) return;
        if (roleColumn.COLUMN_TYPE.includes("'staff'")) return;

        const roles = roleColumn.COLUMN_TYPE
            .slice(5, -1)
            .split(',')
            .map((role) => role.trim())
            .filter(Boolean);
        const enumValues = [...new Set([...roles, "'staff'"])].join(',');
        const nullable = roleColumn.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultValue = roleColumn.COLUMN_DEFAULT
            ? ` DEFAULT ${conn.escape(roleColumn.COLUMN_DEFAULT)}`
            : '';

        await conn.query(
            `ALTER TABLE users MODIFY role ENUM(${enumValues}) ${nullable}${defaultValue}`
        );
        console.log('Da cap nhat users.role de ho tro staff');
    } catch (err) {
        console.error('Loi cap nhat role staff:', err.message);
    }
};

const ensureEmailVerificationSchema = async (conn) => {
    try {
        const [columns] = await conn.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users'
               AND COLUMN_NAME = 'email_verified_at'`
        );

        if (columns.length === 0) {
            await conn.query("ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL");
            await conn.query("UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL");
            console.log('Da them users.email_verified_at');
        }

        await conn.query(
            `CREATE TABLE IF NOT EXISTS email_verifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                email VARCHAR(255) NOT NULL,
                code_hash VARCHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_email_verifications_email (email),
                INDEX idx_email_verifications_user_id (user_id),
                CONSTRAINT fk_email_verifications_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE
             )`
        );
    } catch (err) {
        console.error('Loi khoi tao email verification:', err.message);
    }
};

pool.getConnection()
    .then(conn => {
        console.log('✅ Kết nối MySQL thành công!');
        return Promise.all([
            ensureStaffRole(conn),
            ensureEmailVerificationSchema(conn),
        ]).finally(() => conn.release());
    })
    .catch(err => console.error('❌ Lỗi kết nối MySQL:', err.message));

module.exports = pool;
