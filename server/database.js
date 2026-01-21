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

// 从环境变量获取超级管理员凭据
const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || 'admin';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

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
            payout_amount REAL DEFAULT 0,
            admin_comment TEXT,
            reviewed_by TEXT,
            reviewed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 数据库迁移：如果 payout_amount 列不存在则添加
    try {
        db.exec(`ALTER TABLE srp_requests ADD COLUMN payout_amount REAL DEFAULT 0`);
        console.log('✓ 已添加 payout_amount 列');
    } catch (e) {
        // 列已存在，忽略错误
    }

    // 创建索引以提高查询性能
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_srp_char_id ON srp_requests(char_id);
        CREATE INDEX IF NOT EXISTS idx_srp_status ON srp_requests(status);
        CREATE INDEX IF NOT EXISTS idx_srp_created_at ON srp_requests(created_at);
    `);

    // 超级管理员现在从 .env 文件配置，不再存储在数据库中
    // 检查 .env 配置
    if (!SUPER_ADMIN_PASSWORD) {
        console.log('\n' + '='.repeat(60));
        console.log('⚠️  警告: 未配置超级管理员密码！');
        console.log('='.repeat(60));
        console.log('   请在 .env 文件中设置:');
        console.log('   SUPER_ADMIN_USERNAME=admin');
        console.log('   SUPER_ADMIN_PASSWORD=你的安全密码');
        console.log('='.repeat(60) + '\n');
    } else {
        console.log(`✓ 超级管理员已配置: ${SUPER_ADMIN_USERNAME}`);
    }

    // 清理数据库中可能存在的旧超级管理员记录（迁移用）
    db.prepare('DELETE FROM admins WHERE role = ?').run('super_admin');
}

// === 管理员相关操作 ===

/**
 * 验证管理员登录
 * 超级管理员从 .env 验证，普通管理员从数据库验证
 */
function verifyAdmin(username, password) {
    // 首先检查是否是超级管理员（从 .env 配置）
    if (username === SUPER_ADMIN_USERNAME && SUPER_ADMIN_PASSWORD) {
        if (password === SUPER_ADMIN_PASSWORD) {
            return { id: 0, username: SUPER_ADMIN_USERNAME, role: 'super_admin' };
        }
        return null; // 超级管理员密码错误
    }

    // 然后检查数据库中的普通管理员
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin) return null;
    
    if (bcrypt.compareSync(password, admin.password_hash)) {
        return { id: admin.id, username: admin.username, role: admin.role };
    }
    return null;
}

/**
 * 获取所有管理员
 * 包括从 .env 配置的超级管理员和数据库中的普通管理员
 */
function getAllAdmins() {
    const dbAdmins = db.prepare('SELECT id, username, role, created_at FROM admins').all();
    
    // 添加超级管理员到列表（如果已配置）
    if (SUPER_ADMIN_PASSWORD) {
        return [
            { 
                id: 0, 
                username: SUPER_ADMIN_USERNAME, 
                role: 'super_admin', 
                created_at: '系统配置',
                isEnvAdmin: true  // 标记为 .env 配置的管理员
            },
            ...dbAdmins
        ];
    }
    return dbAdmins;
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
 * 注意：超级管理员(id=0)的密码只能通过修改 .env 文件更改
 */
function changeAdminPassword(adminId, newPassword) {
    // 超级管理员密码不能通过 API 修改
    if (adminId === 0) {
        return false;
    }
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
 * @param {number} requestId - 申请ID
 * @param {string} action - 操作: 'approve' 或 'reject'
 * @param {string} adminComment - 管理员备注
 * @param {string} reviewedBy - 审核人
 * @param {number} payoutAmount - 补损金额（仅批准时有效）
 */
function reviewRequest(requestId, action, adminComment, reviewedBy, payoutAmount = 0) {
    const status = action === 'approve' ? 'approved' : 'rejected';
    // 只有批准时才记录补损金额，拒绝时金额为0
    const amount = action === 'approve' ? (payoutAmount || 0) : 0;
    const result = db.prepare(`
        UPDATE srp_requests 
        SET status = ?, payout_amount = ?, admin_comment = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(status, amount, adminComment, reviewedBy, requestId);
    return result.changes > 0;
}

/**
 * 获取单个申请详情
 */
function getRequestById(requestId) {
    return db.prepare('SELECT * FROM srp_requests WHERE id = ?').get(requestId);
}

/**
 * 更新SRP申请（管理员编辑用）
 * @param {number} requestId - 申请ID
 * @param {string} status - 状态: 'pending', 'approved', 'rejected'
 * @param {number} payoutAmount - 补损金额
 * @param {string} adminComment - 管理员备注
 * @param {string} editedBy - 编辑人
 */
function updateRequest(requestId, status, payoutAmount, adminComment, editedBy) {
    // 如果状态改为 pending，清除审核信息
    if (status === 'pending') {
        const result = db.prepare(`
            UPDATE srp_requests 
            SET status = ?, payout_amount = 0, admin_comment = ?, reviewed_by = NULL, reviewed_at = NULL
            WHERE id = ?
        `).run(status, adminComment || '', requestId);
        return result.changes > 0;
    }
    
    // 否则更新状态和金额
    const amount = status === 'approved' ? (payoutAmount || 0) : 0;
    const result = db.prepare(`
        UPDATE srp_requests 
        SET status = ?, payout_amount = ?, admin_comment = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(status, amount, adminComment || '', editedBy, requestId);
    return result.changes > 0;
}

/**
 * 检查玩家是否已为该killmail提交过申请
 */
function hasExistingRequest(killmailId) {
    const result = db.prepare('SELECT COUNT(*) as count FROM srp_requests WHERE killmail_id = ?').get(killmailId);
    return result.count > 0;
}

/**
 * 获取补损支出统计（管理员用）
 */
function getPayoutStats() {
    // 总体统计
    const totals = db.prepare(`
        SELECT 
            COUNT(*) as total_requests,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN status = 'approved' THEN payout_amount ELSE 0 END) as total_payout
        FROM srp_requests
    `).get();

    // 按月统计（最近12个月）
    const monthly = db.prepare(`
        SELECT 
            strftime('%Y-%m', reviewed_at) as month,
            COUNT(*) as count,
            SUM(payout_amount) as amount
        FROM srp_requests 
        WHERE status = 'approved' 
            AND reviewed_at IS NOT NULL
            AND reviewed_at >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', reviewed_at)
        ORDER BY month DESC
    `).all();

    // 按玩家统计（TOP 10）
    const byPlayer = db.prepare(`
        SELECT 
            char_id,
            char_name,
            COUNT(*) as request_count,
            SUM(payout_amount) as total_amount
        FROM srp_requests 
        WHERE status = 'approved'
        GROUP BY char_id
        ORDER BY total_amount DESC
        LIMIT 10
    `).all();

    return {
        totals: {
            totalRequests: totals.total_requests || 0,
            approvedCount: totals.approved_count || 0,
            totalPayout: totals.total_payout || 0
        },
        monthly,
        byPlayer
    };
}

/**
 * 获取玩家的补损统计
 */
function getPlayerPayoutStats(charId) {
    const result = db.prepare(`
        SELECT 
            COUNT(*) as total_requests,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN status = 'approved' THEN payout_amount ELSE 0 END) as total_payout
        FROM srp_requests
        WHERE char_id = ?
    `).get(charId);

    return {
        totalRequests: result.total_requests || 0,
        approvedCount: result.approved_count || 0,
        totalPayout: result.total_payout || 0
    };
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
    hasExistingRequest,
    updateRequest,
    // 统计
    getPayoutStats,
    getPlayerPayoutStats
};
