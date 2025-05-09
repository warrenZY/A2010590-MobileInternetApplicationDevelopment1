// js/script.js

const JWT_TOKEN_KEY = 'jwtToken';

function getJwtToken() {
    return localStorage.getItem(JWT_TOKEN_KEY);
}

function setJwtToken(token) {
    localStorage.setItem(JWT_TOKEN_KEY, token);
    // console.log("JWT token stored:", token); // 根据需要保留或移除日志
}

function removeJwtToken() {
    localStorage.removeItem(JWT_TOKEN_KEY);
    // console.log("JWT token removed."); // 根据需要保留或移除日志
}

function isAuthenticated() {
    const token = getJwtToken();
    // 简单检查token是否存在且不是字符串 'undefined' 或空字符串
    return token !== null && token !== 'undefined' && token !== '';
}

// 从JWT Token中提取用户名
function getUsernameFromToken() {
    const token = getJwtToken();
    if (!token || token === 'undefined' || token === '') {
        console.log("getUsernameFromToken: No valid JWT token found."); // Log token missing
        return null;
    }
    try {
        // JWT 包含三部分：Header, Payload, Signature，由 '.' 分隔
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error('getUsernameFromToken: JWT token format is invalid (incorrect number of parts).');
            return null;
        }

        // JWT的payload是第二部分，Base64编码
        const payloadBase64 = parts[1];

        // 解码 Base64 字符串
        // 处理 Base64 URL 编码变体（'-' 和 '_' 替换 '+' 和 '/'）
        let base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        // 填充 '=' 使其成为有效的 Base64 字符串长度（4 的倍数）
        while (base64.length % 4 !== 0) {
            base64 += '=';
        }

        const decodedPayload = atob(base64); // 解码Base64

        const payload = JSON.parse(decodedPayload); // 解析JSON
        console.log("getUsernameFromToken: Decoded JWT Payload:", payload); // 保留此日志，帮助您确认 Payload 内容

        // 检查常见的用户名相关声明，包括您提供的 Token 中的完整 URI
        const username = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || // 您提供的 Token 中的完整 URI 键名
            payload['nameid'] || // 标准缩写 Name ID
            payload['sub'] ||     // 标准缩写 Subject
            payload['username'] || // 常见声明: 'username'
            payload['preferred_username'] || // 常见声明: 'preferred_username'
            payload['email'] ||    // 有时 email 也用作标识
            null;

        console.log("getUsernameFromToken: Extracted username:", username); // 保留此日志，确认是否成功提取
        return username;
    } catch (e) {
        console.error('getUsernameFromToken: Failed to parse or decode JWT Token:', e);
        // 可以记录导致错误的 token 部分，但避免记录完整的 token
        // console.error('Failed payload part:', token.split('.')[1]);
        return null;
    }
}


async function registerUser(username, password) {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.Message);
            window.location.href = 'main.html';
        } else {
            alert(`注册失败: ${result.Message || '未知错误'}`);
        }
    } catch (error) {
        console.error('注册请求出错:', error);
        alert('注册过程中发生错误');
    }
}

async function loginUser(username, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok && result.Success && result.Token) {
            setJwtToken(result.Token); // 确保成功登录后设置 Token
            alert(result.Message);
            window.location.href = 'bookList.html';
        } else {
            alert(`登录失败: ${result.Message || '用户名或密码错误'}`);
            removeJwtToken(); // 登录失败时移除 Token
        }
    } catch (error) {
        console.error('登录请求出错:', error);
        alert('登录过程中发生错误');
        removeJwtToken(); // 登录出错时移除 Token
    }
}

function logoutUser() {
    removeJwtToken(); // 移除 Token
    alert('您已注销');
    // 重定向到登录页面
    window.location.href = 'main.html';
}

// 在 DOMContentLoaded 事件中统一处理页面初始化逻辑
document.addEventListener('DOMContentLoaded', () => {
    // 注册表单逻辑 (main.html 或 register.html)
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.onsubmit = function (e) {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            registerUser(username, password);
        };
    }

    // 登录表单逻辑 (main.html)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = function (e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            loginUser(username, password);
        };
    }

    // BookList 页面特定逻辑
    // 使用 window.location.pathname 来更准确判断当前页面
    const currentPagePath = window.location.pathname;
    const isBookListPage = currentPagePath.endsWith('/static/bookList.html') || currentPagePath.endsWith('/bookList.html');

    if (isBookListPage) {
        if (!isAuthenticated()) {
            // 如果未认证，则强制跳转到登录页
            alert('请先登录以访问书籍列表');
            window.location.href = 'main.html';
        } else {
            // 如果已认证，则显示用户名并设置注销按钮事件
            const loggedInUsernameSpan = document.getElementById('loggedInUsername');
            const username = getUsernameFromToken(); // 获取用户名
            if (loggedInUsernameSpan && username) {
                loggedInUsernameSpan.textContent = username; // 设置到 HTML 元素
                console.log("Username displayed:", username); // 添加日志
            } else {
                console.log("Username element not found or username is null after getting token."); // 添加日志
                // 如果用户名仍然为 null，请查看控制台打印的 JWT Payload
                // 确认用户名字段的键名，并修改 getUsernameFromToken 函数
            }

            // 设置注销按钮事件
            const logoutButtonTop = document.getElementById('logoutButtonTop');
            if (logoutButtonTop) {
                logoutButtonTop.addEventListener('click', logoutUser); // 绑定注销事件
                // console.log("Logout button event listener attached."); // 根据需要保留或移除日志
            } else {
                // console.log("Logout button element not found."); // 根据需要保留或移除日志
            }

            // 对于 BookList 页面，还需要调用获取和渲染书籍列表的函数
            // 确保 list-script.js 中的 fetchAndRenderBooks 在 DOMContentLoaded 后被调用
            // 考虑到 list-script.js 也有自己的 DOMContentLoaded 监听，
            // 可以在 list-script.js 中调用 fetchAndRenderBooks。
        }
    }
    // 其他页面（如 main.html, register.html）的初始化逻辑已在各自的 if 块中处理
});