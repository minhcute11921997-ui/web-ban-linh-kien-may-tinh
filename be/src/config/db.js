const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:     process.env.DB_HOST || 'localhost',
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    port:     Number(process.env.DB_PORT) || 3306,
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

pool.getConnection()
    .then(conn => {
        console.log('✅ Kết nối MySQL thành công!');
        return ensureStaffRole(conn).finally(() => conn.release());
    })
    .catch(err => console.error('❌ Lỗi kết nối MySQL:', err.message));

module.exports = pool;
