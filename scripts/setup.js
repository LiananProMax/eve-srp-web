#!/usr/bin/env node
/**
 * EVE SRP 项目初始化脚本
 * 
 * 功能:
 * - 创建必要的目录结构
 * - 检查环境配置
 * - 安装依赖
 * 
 * 使用方法: node scripts/setup.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');

console.log('\n========================================');
console.log('  EVE SRP 项目初始化');
console.log('========================================\n');

// 1. 创建日志目录
console.log('1. 检查日志目录...');
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    console.log('   ✓ 已创建 logs/ 目录');
} else {
    console.log('   ✓ logs/ 目录已存在');
}

// 2. 检查环境变量文件
console.log('\n2. 检查环境配置...');
const envPath = path.join(SERVER_DIR, '.env');
const envExamplePath = path.join(SERVER_DIR, 'env.example');

if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
        console.log('   ! 未找到 .env 文件');
        console.log('   ! 请复制 server/env.example 为 server/.env 并配置');
        console.log('   ! 命令: cp server/env.example server/.env');
    } else {
        console.log('   ✗ 缺少 env.example 文件');
    }
} else {
    console.log('   ✓ .env 文件已存在');
    
    // 检查关键配置
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const requiredKeys = ['CLIENT_ID', 'SECRET_KEY', 'JWT_SECRET'];
    const missingKeys = requiredKeys.filter(key => {
        const regex = new RegExp(`^${key}=.+`, 'm');
        return !regex.test(envContent) || envContent.includes(`${key}=your`);
    });
    
    if (missingKeys.length > 0) {
        console.log('   ! 以下配置项需要设置:');
        missingKeys.forEach(key => console.log(`     - ${key}`));
    }
}

// 3. 安装后端依赖
console.log('\n3. 安装后端依赖...');
try {
    process.chdir(SERVER_DIR);
    execSync('npm install', { stdio: 'inherit' });
    console.log('   ✓ 后端依赖安装完成');
} catch (error) {
    console.log('   ✗ 后端依赖安装失败');
}

// 4. 安装前端依赖
console.log('\n4. 安装前端依赖...');
try {
    process.chdir(CLIENT_DIR);
    execSync('npm install', { stdio: 'inherit' });
    console.log('   ✓ 前端依赖安装完成');
} catch (error) {
    console.log('   ✗ 前端依赖安装失败');
}

// 5. 完成
console.log('\n========================================');
console.log('  初始化完成！');
console.log('========================================');
console.log('\n下一步操作:');
console.log('  1. 配置 server/.env 文件');
console.log('  2. 启动后端: cd server && npm run dev');
console.log('  3. 启动前端: cd client && npm run dev');
console.log('  4. 访问: http://localhost:5173');
console.log('');
