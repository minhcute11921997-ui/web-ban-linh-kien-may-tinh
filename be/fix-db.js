const db = require('./src/config/db');

async function fixUsersTable() {
    try {
        const [cols] = await db.query('SHOW COLUMNS FROM users');
        const colNames = cols.map(c => c.Field);
        console.log('Cot hien tai:', colNames.join(', '));

        if (!colNames.includes('username')) {
            await db.query('ALTER TABLE users ADD COLUMN username VARCHAR(100) AFTER id');
            console.log('Da them cot username');
        }
        if (!colNames.includes('full_name') && colNames.includes('name')) {
            await db.query('ALTER TABLE users CHANGE COLUMN name full_name VARCHAR(100)');
            console.log('Da doi name -> full_name');
        } else if (!colNames.includes('full_name')) {
            await db.query('ALTER TABLE users ADD COLUMN full_name VARCHAR(100) AFTER username');
            console.log('Da them cot full_name');
        }
        if (!colNames.includes('phone')) {
            await db.query('ALTER TABLE users ADD COLUMN phone VARCHAR(20)');
            console.log('Da them cot phone');
        }
        if (!colNames.includes('address')) {
            await db.query('ALTER TABLE users ADD COLUMN address TEXT');
            console.log('Da them cot address');
        }

        // Cap nhat username tu email neu username null
        await db.query("UPDATE users SET username = SUBSTRING_INDEX(email, '@', 1) WHERE username IS NULL");
        console.log('Da cap nhat username cho users cu');

        const [newCols] = await db.query('SHOW COLUMNS FROM users');
        console.log('Cot sau khi sua:', newCols.map(c => c.Field).join(', '));

        process.exit(0);
    } catch (err) {
        console.error('Loi:', err.message);
        process.exit(1);
    }
}

fixUsersTable();
