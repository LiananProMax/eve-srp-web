require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');

// 引入数据库模块
const db = require('./database');

const app = express();

// === 安全配置 ===

// 1. HTTP 安全头 (helmet)
app.use(helmet({
    contentSecurityPolicy: false, // 如果有前端同域部署可以启用
    crossOriginEmbedderPolicy: false
}));

// 2. CORS 配置 - 限制允许的来源
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // 允许无 origin 的请求（如 Postman、curl）在开发环境
        if (!origin && process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS 不允许的来源'));
        }
    },
    credentials: true
}));

// 3. 速率限制配置
// 通用 API 限制
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 最多100次请求
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false
});

// 登录专用限制（更严格）
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 最多5次尝试
    message: { error: '登录尝试次数过多，请15分钟后再试' },
    standardHeaders: true,
    legacyHeaders: false
});

// SRP 提交限制
const srpSubmitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 20, // 最多20次提交
    message: { error: 'SRP 申请提交过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false
});

// 应用通用速率限制
app.use('/api/', generalLimiter);

app.use(bodyParser.json({ limit: '10kb' })); // 限制请求体大小

// === 配置检查 ===
const CLIENT_ID = process.env.CLIENT_ID;
const SECRET_KEY = process.env.SECRET_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:5173/auth/callback';
const TARGET_CORP_ID = parseInt(process.env.TARGET_CORP_ID) || 98802528;

// 生产环境必须配置 JWT_SECRET
if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        console.error('错误: 生产环境必须设置 JWT_SECRET 环境变量！');
        process.exit(1);
    } else {
        console.warn('警告: 未设置 JWT_SECRET，使用开发环境默认值（请勿在生产环境使用）');
    }
}
const JWT_SECRET_KEY = JWT_SECRET || 'dev-only-secret-do-not-use-in-production';

// === 输入验证辅助函数 ===
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            error: '输入验证失败', 
            details: errors.array().map(e => e.msg) 
        });
    }
    next();
};

// === JWT 中间件 ===

// 管理员认证中间件
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未提供认证token' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        if (decoded.type !== 'admin') {
            return res.status(403).json({ error: '无效的管理员凭证' });
        }
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token无效或已过期' });
    }
}

// 用户（玩家）认证中间件
function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未提供认证token' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        if (decoded.type !== 'user') {
            return res.status(403).json({ error: '无效的用户凭证' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token无效或已过期' });
    }
}

// 验证用户是否请求自己的数据
function validateUserOwnership(req, res, next) {
    const requestedCharId = parseInt(req.params.charId);
    if (req.user.charId !== requestedCharId) {
        return res.status(403).json({ error: '无权访问其他角色的数据' });
    }
    next();
}

// 验证是否为超级管理员
function requireSuperAdmin(req, res, next) {
    if (req.admin.role !== 'super_admin') {
        return res.status(403).json({ error: '需要超级管理员权限' });
    }
    next();
}

// === 0. 公开配置 API ===
// 返回前端需要的公开配置（不包含敏感信息）
app.get('/api/config', (req, res) => {
    res.json({
        // EVE SSO 配置（公开信息）
        eveClientId: CLIENT_ID,
        callbackUrl: CALLBACK_URL,
        
        // 军团信息
        corpId: TARGET_CORP_ID,
        corpName: process.env.CORP_NAME || 'The Zephyr Brigade',
        corpTicker: process.env.CORP_TICKER || 'T-ZB',
        allianceName: process.env.ALLIANCE_NAME || '',
        
        // 联系方式
        qqGroupLink: process.env.QQ_GROUP_LINK || '',
        discordContactId: process.env.DISCORD_CONTACT_ID || '',
        discordContactNickname: process.env.DISCORD_CONTACT_NICKNAME || '',
        discordContactAvatar: process.env.DISCORD_CONTACT_AVATAR || '',
    });
});

// === 1. EVE SSO 登录逻辑 ===
const getAuthHeader = () => {
    return 'Basic ' + Buffer.from(`${CLIENT_ID}:${SECRET_KEY}`).toString('base64');
};

app.post('/api/auth/eve', 
    [
        body('code').isString().notEmpty().withMessage('授权码不能为空')
    ],
    handleValidationErrors,
    async (req, res) => {
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

            // 4. 生成用户 JWT Token（不再返回 EVE accessToken 给客户端）
            const userToken = jwt.sign(
                { 
                    type: 'user',
                    charId, 
                    charName,
                    corpId: charPublicRes.data.corporation_id
                },
                JWT_SECRET_KEY,
                { expiresIn: '8h' }  // 8小时过期
            );

            res.json({ 
                charId, 
                charName, 
                token: userToken  // 返回自己的 JWT，而非 EVE 的 accessToken
            });
        } catch (error) {
            console.error("SSO Error:", error.response ? error.response.data : error.message);
            // 不暴露详细错误信息给客户端
            res.status(500).json({ error: 'SSO 登录失败，请稍后再试' });
        }
    }
);

// === 2. 获取 zKillboard 数据 ===
app.get('/api/losses/:charId', 
    authenticateUser,  // 需要用户认证
    [
        param('charId').isInt({ min: 1 }).withMessage('角色ID必须是正整数')
    ],
    handleValidationErrors,
    validateUserOwnership,  // 验证只能查询自己的数据
    async (req, res) => {
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
            res.status(500).json({ error: '获取 zKillboard 数据失败' });
        }
    }
);

// === 3. 提交 SRP ===
app.post('/api/srp', 
    srpSubmitLimiter,  // SRP 提交专用速率限制
    authenticateUser,  // 需要用户认证
    [
        body('lossMail').isObject().withMessage('损失记录不能为空'),
        body('lossMail.killmail_id').isInt({ min: 1 }).withMessage('无效的 killmail ID'),
        body('lossMail.ship_type_id').isInt({ min: 1 }).withMessage('无效的船只类型 ID'),
        body('comment').optional().isString().isLength({ max: 500 }).withMessage('备注不能超过500字符')
    ],
    handleValidationErrors,
    (req, res) => {
        const { lossMail, comment } = req.body;
        
        // 使用 token 中的用户信息，而非请求体中的（防止伪造）
        const charId = req.user.charId;
        const charName = req.user.charName;

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
    }
);

// === 4. 玩家查看自己的申请 ===
app.get('/api/srp/my/:charId', 
    authenticateUser,  // 需要用户认证
    [
        param('charId').isInt({ min: 1 }).withMessage('角色ID必须是正整数')
    ],
    handleValidationErrors,
    validateUserOwnership,  // 验证只能查询自己的数据
    (req, res) => {
        const { charId } = req.params;
        try {
            const requests = db.getPlayerRequests(parseInt(charId));
            res.json(requests);
        } catch (error) {
            console.error("Get player requests error:", error.message);
            res.status(500).json({ error: '获取申请记录失败' });
        }
    }
);

// === 5. 管理员登录 ===
app.post('/api/admin/login', 
    loginLimiter,  // 登录专用速率限制
    [
        body('username').isString().trim().notEmpty().withMessage('用户名不能为空'),
        body('password').isString().notEmpty().withMessage('密码不能为空')
    ],
    handleValidationErrors,
    (req, res) => {
        const { username, password } = req.body;

        const admin = db.verifyAdmin(username, password);
        if (admin) {
            const token = jwt.sign(
                { 
                    type: 'admin',  // 标识为管理员 token
                    id: admin.id, 
                    username: admin.username, 
                    role: admin.role 
                },
                JWT_SECRET_KEY,
                { expiresIn: '8h' }  // 缩短到8小时
            );
            res.json({
                token,
                admin: { username: admin.username, role: admin.role }
            });
        } else {
            // 使用统一的错误消息，不泄露是用户名还是密码错误
            res.status(401).json({ error: '用户名或密码错误' });
        }
    }
);

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
app.post('/api/admin/review', 
    authenticateAdmin, 
    [
        body('id').isInt({ min: 1 }).withMessage('无效的申请ID'),
        body('action').isIn(['approve', 'reject']).withMessage('操作必须是 approve 或 reject'),
        body('adminComment').optional().isString().isLength({ max: 500 }).withMessage('管理员备注不能超过500字符')
    ],
    handleValidationErrors,
    (req, res) => {
        const { id, action, adminComment } = req.body;

        const success = db.reviewRequest(id, action, adminComment || '', req.admin.username);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: '申请不存在' });
        }
    }
);

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

// 密码强度验证函数
function validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const errors = [];
    if (password.length < minLength) {
        errors.push(`密码长度至少${minLength}位`);
    }
    if (!hasUpperCase) {
        errors.push('需要包含大写字母');
    }
    if (!hasLowerCase) {
        errors.push('需要包含小写字母');
    }
    if (!hasNumbers) {
        errors.push('需要包含数字');
    }
    if (!hasSpecialChar) {
        errors.push('需要包含特殊字符(!@#$%^&*等)');
    }
    
    return errors;
}

// 添加管理员
app.post('/api/admin/admins', 
    authenticateAdmin, 
    requireSuperAdmin, 
    [
        body('username').isString().trim().isLength({ min: 3, max: 32 }).withMessage('用户名长度需要3-32个字符'),
        body('username').matches(/^[a-zA-Z0-9_]+$/).withMessage('用户名只能包含字母、数字和下划线'),
        body('password').isString().notEmpty().withMessage('密码不能为空'),
        body('role').optional().isIn(['admin']).withMessage('角色只能是 admin')  // 不允许通过API创建超级管理员
    ],
    handleValidationErrors,
    (req, res) => {
        const { username, password, role = 'admin' } = req.body;

        // 验证密码强度
        const passwordErrors = validatePasswordStrength(password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ 
                error: '密码强度不足', 
                details: passwordErrors 
            });
        }

        const result = db.addAdmin(username, password, role);
        if (result.success) {
            res.json({ success: true, id: result.id });
        } else {
            res.status(400).json({ error: result.error });
        }
    }
);

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
app.post('/api/admin/change-password', 
    authenticateAdmin, 
    [
        body('newPassword').isString().notEmpty().withMessage('新密码不能为空')
    ],
    handleValidationErrors,
    (req, res) => {
        const { newPassword } = req.body;

        // 验证密码强度
        const passwordErrors = validatePasswordStrength(newPassword);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ 
                error: '密码强度不足', 
                details: passwordErrors 
            });
        }

        const success = db.changeAdminPassword(req.admin.id, newPassword);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: '修改密码失败' });
        }
    }
);

// === 启动服务器 ===
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`目标军团ID: ${TARGET_CORP_ID}`);
});
