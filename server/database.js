/**
 * SQLite 数据库初始化和模型
 */
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, 'srp_data.db');
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

/**
 * 初始化数据库表结构
 */
function initializeDatabase() {
    // 管理员表
    db.exec(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // SRP申请表
    db.exec(`
        CREATE TABLE IF NOT EXISTS srp_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            char_id INTEGER NOT NULL,
            char_name TEXT NOT NULL,
            killmail_id INTEGER NOT NULL UNIQUE,
            ship_type_id INTEGER NOT NULL,
            zkill_url TEXT NOT NULL,
            player_comment TEXT,
            status TEXT DEFAULT 'pending',
            admin_comment TEXT,
            reviewed_by TEXT,
            reviewed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 创建索引以提高查询性能
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_srp_char_id ON srp_requests(char_id);
        CREATE INDEX IF NOT EXISTS idx_srp_status ON srp_requests(status);
        CREATE INDEX IF NOT EXISTS idx_srp_created_at ON srp_requests(created_at);
    `);

    // 检查是否存在默认管理员，不存在则创建
    const adminExists = db.prepare('SELECT COUNT(*) as count FROM admins').get();
    if (adminExists.count === 0) {
        // 生成随机强密码
        const crypto = require('crypto');
        const generateStrongPassword = () => {
            const length = 16;
            const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
            let password = '';
            const randomBytes = crypto.randomBytes(length);
            for (let i = 0; i < length; i++) {
                password += charset[randomBytes[i] % charset.length];
            }
            // 确保包含各种字符类型
            password = password.slice(0, -4) + 'Aa1!';
            return password;
        };
        
        const defaultPassword = generateStrongPassword();
        const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
        db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)')
            .run('admin', hashedPassword, 'super_admin');
        
        console.log('\n' + '='.repeat(60));
        console.log('⚠️  首次启动 - 已创建默认超级管理员账号');
        console.log('='.repeat(60));
        console.log(`   用户名: admin`);
        console.log(`   密码: ${defaultPassword}`);
        console.log('='.repeat(60));
        console.log('⚠️  请立即登录并修改密码！此密码只显示一次！');
        console.log('='.repeat(60) + '\n');
    }
}

// === 管理员相关操作 ===

/**
 * 验证管理员登录
 */
function verifyAdmin(username, password) {
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin) return null;
    
    if (bcrypt.compareSync(password, admin.password_hash)) {
        return { id: admin.id, username: admin.username, role: admin.role };
    }
    return null;
}

/**
 * 获取所有管理员
 */
function getAllAdmins() {
    return db.prepare('SELECT id, username, role, created_at FROM admins').all();
}

/**
 * 添加管理员
 */
function addAdmin(username, password, role = 'admin') {
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
        const result = db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)')
            .run(username, hashedPassword, role);
        return { success: true, id: result.lastInsertRowid };
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return { success: false, error: '用户名已存在' };
        }
        throw err;
    }
}

/**
 * 删除管理员
 */
function deleteAdmin(adminId) {
    const result = db.prepare('DELETE FROM admins WHERE id = ? AND role != ?').run(adminId, 'super_admin');
    return result.changes > 0;
}

/**
 * 修改管理员密码
 */
function changeAdminPassword(adminId, newPassword) {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const result = db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hashedPassword, adminId);
    return result.changes > 0;
}

// === SRP申请相关操作 ===

/**
 * 创建SRP申请
 */
function createSrpRequest(charId, charName, killmailId, shipTypeId, zkillUrl, playerComment) {
    try {
        const result = db.prepare(`
            INSERT INTO srp_requests (char_id, char_name, killmail_id, ship_type_id, zkill_url, player_comment)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(charId, charName, killmailId, shipTypeId, zkillUrl, playerComment);
        return { success: true, id: result.lastInsertRowid };
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return { success: false, error: '该损失记录已经提交过申请' };
        }
        throw err;
    }
}

/**
 * 获取玩家的所有SRP申请
 */
function getPlayerRequests(charId) {
    return db.prepare(`
        SELECT * FROM srp_requests 
        WHERE char_id = ? 
        ORDER BY created_at DESC
    `).all(charId);
}

/**
 * 获取所有SRP申请（管理员用）
 */
function getAllRequests(status = null, limit = 100, offset = 0) {
    if (status && status !== 'all') {
        return db.prepare(`
            SELECT * FROM srp_requests 
            WHERE status = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).all(status, limit, offset);
    }
    return db.prepare(`
        SELECT * FROM srp_requests 
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `).all(limit, offset);
}

/**
 * 获取申请统计
 */
function getRequestStats() {
    return db.prepare(`
        SELECT 
            status,
            COUNT(*) as count
        FROM srp_requests
        GROUP BY status
    `).all();
}

/**
 * 审核SRP申请
 */
function reviewRequest(requestId, action, adminComment, reviewedBy) {
    const status = action === 'approve' ? 'approved' : 'rejected';
    const result = db.prepare(`
        UPDATE srp_requests 
        SET status = ?, admin_comment = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(status, adminComment, reviewedBy, requestId);
    return result.changes > 0;
}

/**
 * 获取单个申请详情
 */
function getRequestById(requestId) {
    return db.prepare('SELECT * FROM srp_requests WHERE id = ?').get(requestId);
}

/**
 * 检查玩家是否已为该killmail提交过申请
 */
function hasExistingRequest(killmailId) {
    const result = db.prepare('SELECT COUNT(*) as count FROM srp_requests WHERE killmail_id = ?').get(killmailId);
    return result.count > 0;
}

// 初始化数据库
initializeDatabase();

module.exports = {
    db,
    // 管理员
    verifyAdmin,
    getAllAdmins,
    addAdmin,
    deleteAdmin,
    changeAdminPassword,
    // SRP
    createSrpRequest,
    getPlayerRequests,
    getAllRequests,
    getRequestStats,
    reviewRequest,
    getRequestById,
    hasExistingRequest
};
