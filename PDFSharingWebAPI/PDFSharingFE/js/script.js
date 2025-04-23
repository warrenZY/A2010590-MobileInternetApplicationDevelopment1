// 用户数据存储（模拟实现）
function saveUserData(username, password) {
    const userData = `<user>
        <username>${username}</username>
        <password>${password}</password>
    </user>`;
    
    // 实际应通过后端API保存到userdata.xml
    localStorage.setItem('userData', userData);
}

// 登录验证
function validateUser(username, password) {
    const storedData = localStorage.getItem('userData');
    if (!storedData) return false;
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(storedData, "text/xml");
    return xmlDoc.querySelector('username').textContent === username && 
           xmlDoc.querySelector('password').textContent === password;
}

// 事件监听
document.addEventListener('DOMContentLoaded', () => {
    // 注册表单
    if (document.getElementById('registerForm')) {
        document.getElementById('registerForm').onsubmit = function(e) {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            saveUserData(username, password);
            alert('注册成功！');
            window.location.href = 'main.html';
        };
    }

    // 登录表单
    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').onsubmit = function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (validateUser(username, password)) {
                window.location.href = 'bookList.html';
            } else {
                alert('用户名或密码错误');
            }
        };
    }

    // 书籍列表页
    if (document.getElementById('bookList')) {
        renderBooks();
        
        /*// 拖拽上传
        const dropZone = document.getElementById('dropZone');
        
        ['dragover', 'dragenter'].forEach(event => {
            dropZone.addEventListener(event, e => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(event => {
            dropZone.addEventListener(event, e => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            });
        });

        dropZone.addEventListener('drop', e => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files[0]);
            }
        });*/
    }
});