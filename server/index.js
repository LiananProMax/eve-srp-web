require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

// 引入数据库模块
const db = require('./database');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// === 配置 ===
const CLIENT_ID = process.env.CLIENT_ID;
const SECRET_KEY = process.env.SECRET_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production';
const CALLBACK_URL = 'http://localhost:5173/auth/callback';
const TARGET_CORP_ID = parseInt(process.env.TARGET_CORP_ID) || 98802528;

// === JWT 中间件 ===
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未提供认证token' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token无效或已过期' });
    }
}

// 验证是否为超级管理员
function requireSuperAdmin(req, res, next) {
    if (req.admin.role !== 'super_admin') {
        return res.status(403).json({ error: '需要超级管理员权限' });
    }
    next();
}

// === 1. EVE SSO 登录逻辑 ===
const getAuthHeader = () => {
    return 'Basic ' + Buffer.from(`${CLIENT_ID}:${SECRET_KEY}`).toString('base64');
};

app.post('/api/auth/eve', async (req, res) => {
    const { code } = req.body;
    try {
        // 1. 用 Code 换 Token
        const tokenRes = await axios.post('https://login.eveonline.com/v2/oauth/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: CALLBACK_URL
            }),
            { headers: { 'Authorization': getAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        const accessToken = tokenRes.data.access_token;

        // 2. 验证 Token 并获取角色信息
        const verifyRes = await axios.get('https://login.eveonline.com/oauth/verify', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const charData = verifyRes.data;
        const charId = charData.CharacterID;
        const charName = charData.CharacterName;

        // 3. 获取角色的公开信息以验证军团 (通过ESI)
        const charPublicRes = await axios.get(`https://esi.evetech.net/latest/characters/${charId}/`);
        if (charPublicRes.data.corporation_id !== TARGET_CORP_ID) {
            return res.status(403).json({ error: '非本军团成员' });
        }

        res.json({ charId, charName, accessToken });
    } catch (error) {
        console.error("SSO Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'SSO Login Failed' });
    }
});

// === 2. 获取 zKillboard 数据 ===
app.get('/api/losses/:charId', async (req, res) => {
    const { charId } = req.params;
    try {
        const zkRes = await axios.get(`https://zkillboard.com/api/characterID/${charId}/losses/`, {
            headers: {
                'User-Agent': 'EveSrpTool-Maintainer/1.0',
                'Accept-Encoding': 'gzip'
            }
        });
        
        // 获取最近20条（减少API调用）
        const zkillData = zkRes.data.slice(0, 20);
        
        // 并行获取每个 killmail 的完整数据（包含时间）
        const enrichedLosses = await Promise.all(
            zkillData.map(async (loss) => {
                try {
                    const hash = loss.zkb?.hash;
                    if (hash) {
                        const esiRes = await axios.get(
                            `https://esi.evetech.net/latest/killmails/${loss.killmail_id}/${hash}/`
                        );
                        return {
                            ...loss,
                            killmail_time: esiRes.data.killmail_time,
                            ship_type_id: esiRes.data.victim?.ship_type_id || loss.ship_type_id
                        };
                    }
                    return loss;
                } catch (err) {
                    console.error(`ESI Error for killmail ${loss.killmail_id}:`, err.message);
                    return loss;
                }
            })
        );
        
        res.json(enrichedLosses);
    } catch (error) {
        console.error("zKill Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch zKillboard' });
    }
});

// === 3. 提交 SRP ===
app.post('/api/srp', (req, res) => {
    const { charId, charName, lossMail, comment } = req.body;

    if (!charId || !charName || !lossMail) {
        return res.status(400).json({ error: '缺少必要参数' });
    }

    const zkillUrl = `https://zkillboard.com/kill/${lossMail.killmail_id}/`;
    const result = db.createSrpRequest(
        charId,
        charName,
        lossMail.killmail_id,
        lossMail.ship_type_id,
        zkillUrl,
        comment || ''
    );

    if (result.success) {
        res.json({ success: true, id: result.id });
    } else {
        res.status(400).json({ error: result.error });
    }
});

// === 4. 玩家查看自己的申请 ===
app.get('/api/srp/my/:charId', (req, res) => {
    const { charId } = req.params;
    try {
        const requests = db.getPlayerRequests(parseInt(charId));
        res.json(requests);
    } catch (error) {
        console.error("Get player requests error:", error.message);
        res.status(500).json({ error: '获取申请记录失败' });
    }
});

// === 5. 管理员登录 ===
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    const admin = db.verifyAdmin(username, password);
    if (admin) {
        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({
            token,
            admin: { username: admin.username, role: admin.role }
        });
    } else {
        res.status(401).json({ error: '用户名或密码错误' });
    }
});

// === 6. 获取所有申请（管理员） ===
app.get('/api/admin/requests', authenticateAdmin, (req, res) => {
    const { status, limit = 100, offset = 0 } = req.query;
    try {
        const requests = db.getAllRequests(status, parseInt(limit), parseInt(offset));
        const stats = db.getRequestStats();
        res.json({ requests, stats });
    } catch (error) {
        console.error("Get requests error:", error.message);
        res.status(500).json({ error: '获取申请列表失败' });
    }
});

// === 7. 审核申请（管理员） ===
app.post('/api/admin/review', authenticateAdmin, (req, res) => {
    const { id, action, adminComment } = req.body;

    if (!id || !action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: '参数错误' });
    }

    const success = db.reviewRequest(id, action, adminComment || '', req.admin.username);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: '申请不存在' });
    }
});

// === 8. 获取单个申请详情 ===
app.get('/api/admin/request/:id', authenticateAdmin, (req, res) => {
    const { id } = req.params;
    const request = db.getRequestById(parseInt(id));
    if (request) {
        res.json(request);
    } else {
        res.status(404).json({ error: '申请不存在' });
    }
});

// === 9. 获取申请统计 ===
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
    try {
        const stats = db.getRequestStats();
        res.json(stats);
    } catch (error) {
        console.error("Get stats error:", error.message);
        res.status(500).json({ error: '获取统计信息失败' });
    }
});

// === 10. 管理员管理（仅超级管理员） ===

// 获取所有管理员
app.get('/api/admin/admins', authenticateAdmin, requireSuperAdmin, (req, res) => {
    try {
        const admins = db.getAllAdmins();
        res.json(admins);
    } catch (error) {
        res.status(500).json({ error: '获取管理员列表失败' });
    }
});

// 添加管理员
app.post('/api/admin/admins', authenticateAdmin, requireSuperAdmin, (req, res) => {
    const { username, password, role = 'admin' } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const result = db.addAdmin(username, password, role);
    if (result.success) {
        res.json({ success: true, id: result.id });
    } else {
        res.status(400).json({ error: result.error });
    }
});

// 删除管理员
app.delete('/api/admin/admins/:id', authenticateAdmin, requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const success = db.deleteAdmin(parseInt(id));
    if (success) {
        res.json({ success: true });
    } else {
        res.status(400).json({ error: '无法删除该管理员（可能是超级管理员）' });
    }
});

// 修改密码
app.post('/api/admin/change-password', authenticateAdmin, (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: '密码长度至少6位' });
    }

    const success = db.changeAdminPassword(req.admin.id, newPassword);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: '修改密码失败' });
    }
});

// === 启动服务器 ===
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`目标军团ID: ${TARGET_CORP_ID}`);
});
