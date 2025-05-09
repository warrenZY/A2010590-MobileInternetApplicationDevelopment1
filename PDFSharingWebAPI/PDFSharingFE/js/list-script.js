// js/list-script.js

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const status = document.getElementById('status');
    const fileNameInput = document.getElementById('fileName');
    const fileDescription = document.getElementById('description');
    const bookListContainer = document.getElementById('bookList');

    let selectedFile = null;

    function handleDragOver(e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFile(file) {
        if (file.type !== 'application/pdf') {
            showStatus('请选择PDF文件', 'error');
            return;
        }
        selectedFile = file;

        const fileName = file.name;
        fileNameInput.value = fileName;

        showStatus(`已选择文件: ${file.name}`);
        fileInput.files = new DataTransfer().files;
    }

    async function uploadFile() {
        if (!selectedFile || !fileNameInput.value.trim()) {
            showStatus('请填写文档名称并选择文件', 'error');
            return;
        }

        if (!isAuthenticated()) {
            showStatus('未认证，请先登录', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('Name', fileNameInput.value.trim());
        formData.append('Description', fileDescription.value.trim());
        formData.append('FileData', selectedFile);

        try {
            uploadBtn.disabled = true;
            showStatus('上传中...');

            const response = await fetch('/api/BookList', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getJwtToken()}`
                },
                body: formData
            });

            if (response.status === 401 || response.status === 403) {
                showStatus('认证失败或无权限，请重新登录', 'error');
                setTimeout(() => { logoutUser(); }, 2000);
                return;
            }

            const result = await response.json();
            if (response.ok && result.Result === "Success") {
                showStatus(`上传成功：${result.Message}`, 'success');
                resetForm();
            } else {
                throw new Error(result.Message || '上传失败');
            }

        } catch (error) {
            showStatus(`上传失败: ${error.message}`, 'error');
        } finally {
            uploadBtn.disabled = false;
            setTimeout(fetchAndRenderBooks, 500);
        }
    }

    function showStatus(message, type = 'info') {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = 'status';
        if (type === 'success') status.classList.add('success');
        if (type === 'error') status.classList.add('error');
        status.style.display = 'block';

        setTimeout(() => {
            status.textContent = '';
            status.className = 'status';
            status.style.display = 'none';
        }, 5000);
    }

    function resetForm() {
        selectedFile = null;
        fileNameInput.value = '';
        fileDescription.value = '';
        fileInput.value = '';
    }

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    uploadBtn.addEventListener('click', () => {
        uploadFile();
    });

    async function fetchAndRenderBooks() {
        const status = document.getElementById('status');
        if (!isAuthenticated()) {
            showStatus('未认证，请先登录', 'error');
            return;
        }

        try {
            showStatus('加载书籍列表中...');
            const response = await fetch('/api/BookList', {
                headers: {
                    'Authorization': `Bearer ${getJwtToken()}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                showStatus('认证失败或无权限，请重新登录', 'error');
                setTimeout(() => { logoutUser(); }, 2000);
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }

            const books = await response.json();
            renderBooks(books);
            showStatus('书籍列表加载成功', 'success');
        } catch (error) {
            console.error('获取书籍列表失败:', error);
            showStatus(`⚠️ 无法加载书籍列表，请检查网络连接或认证状态: ${error.message}`, 'error');
        }
    }

    // 渲染书籍列表 (确保HTML结构与CSS匹配)
    function renderBooks(books) {
        const list = document.getElementById('bookList');

        if (!books || books.length === 0) {
            list.innerHTML = '<p>暂无书籍可显示。</p>';
            return;
        }

        list.innerHTML = books.map(book => `
            <div class="book-card">
                <h3>${book.FileName}</h3>
                ${book.Description ? `
                    <div class="book-description">
                        📝 ${book.Description}
                    </div>
                ` : ''}
                <div class="book-meta">
                    <span class="upload-time">
                        🕒 ${new Date(book.CreationTime).toLocaleDateString()}
                    </span>
                </div>
                <div class="book-actions">
                    <a href="/api/BookList/${encodeURIComponent(book.FileName)}"
                       target="_blank"
                       class="preview-btn">
                        👁️ 在线阅读
                    </a>
                    <button class="delete-btn" data-filename="${encodeURIComponent(book.FileName)}">
                        删除
                    </button>
                </div>
                <div class="share-options">
                     <input type="number" class="share-duration" value="1" min="1">
                     <select class="share-unit">
                         <option value="seconds">秒</option>
                         <option value="minutes">分</option>
                         <option value="hours">时</option>
                         <option value="days">天</option>
                         <option value="permanent">永久</option>
                     </select>
                    <button class="share-btn" data-filename="${encodeURIComponent(book.FileName)}">
                        生成分享链接
                    </button>
                 </div>
                 <div class="share-link-area" style="display: none;">
                     <label>分享链接:</label>
                    <input type="text" readonly class="share-link-input">
                    <button class="copy-link-btn">复制</button>
                 </div>
            </div>
        `).join('');

        attachButtonListeners();
    }

    // 附加按钮事件监听器... (保持不变)
    function attachButtonListeners() {
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function () {
                const fileName = decodeURIComponent(this.dataset.filename);
                handleDelete(fileName);
            });
        });

        document.querySelectorAll('.share-btn').forEach(button => {
            button.addEventListener('click', function () {
                const fileName = decodeURIComponent(this.dataset.filename);
                const bookCard = this.closest('.book-card');
                const durationInput = bookCard.querySelector('.share-duration');
                const unitSelect = bookCard.querySelector('.share-unit');
                const duration = parseInt(durationInput.value, 10);
                const unit = unitSelect.value;

                generateShareLink(fileName, duration, unit, bookCard);
            });
        });

        document.querySelectorAll('.copy-link-btn').forEach(button => {
            button.addEventListener('click', function () {
                const shareLinkInput = this.previousElementSibling;
                copyShareLink(shareLinkInput);
            });
        });
    }

    // 删除处理... (保持不变)
    async function handleDelete(fileName) {
        const status = document.getElementById('status');

        if (!confirm(`确定要删除 ${decodeURIComponent(fileName)} 吗 ?`)) return;

        if (!isAuthenticated()) {
            showStatus('未认证，请先登录', 'error');
            return;
        }

        try {
            showStatus(`删除文件 ${decodeURIComponent(fileName)} 中...`);
            const response = await fetch(`/api/BookList`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getJwtToken()}`
                },
                body: JSON.stringify({
                    FileName: decodeURIComponent(fileName)
                })
            });

            if (response.status === 401 || response.status === 403) {
                showStatus('认证失败或无权限，请重新登录', 'error');
                setTimeout(() => { logoutUser(); }, 2000);
                return;
            }

            if (!response.ok) {
                const errorResponse = await response.json();
                throw new Error(errorResponse.Message || `删除失败: ${response.statusText}`);
            }

            fetchAndRenderBooks();
            showStatus(`${decodeURIComponent(fileName)} 已成功删除`, 'success');

        } catch (error) {
            console.error('删除操作失败:', error);
            showStatus(`${decodeURIComponent(fileName)} 删除失败: ${error.message}`, 'error');
        }
    }

    // 生成分享链接... (保持不变)
    async function generateShareLink(fileName, duration, unit, bookCardElement) {
        const status = document.getElementById('status');
        const shareLinkArea = bookCardElement.querySelector('.share-link-area');
        const shareLinkInput = bookCardElement.querySelector('.share-link-input');

        if (shareLinkArea.style.display !== 'none') {
            shareLinkArea.style.display = 'none';
            return;
        }

        if (!isAuthenticated()) {
            showStatus('未认证，请先登录以生成分享链接', 'error');
            return;
        }

        try {
            showStatus(`为 ${fileName} 生成分享链接中...`);
            const response = await fetch(`/api/share/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getJwtToken()}`
                },
                body: JSON.stringify({
                    fileName: fileName,
                    duration: duration,
                    durationUnit: unit
                })
            });

            if (response.status === 401 || response.status === 403) {
                showStatus('认证失败或无权限，请重新登录', 'error');
                setTimeout(() => { logoutUser(); }, 2000);
                return;
            }

            if (!response.ok) {
                const errorResponse = await response.json();
                throw new Error(errorResponse.Message || `生成分享链接失败: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.Success && result.ShareLinkUrl) {
                shareLinkInput.value = result.ShareLinkUrl;
                shareLinkArea.style.display = 'flex';
                showStatus(`分享链接已生成`, 'success');
            } else {
                throw new Error(result.Message || '生成分享链接失败');
            }

        } catch (error) {
            console.error('生成分享链接失败:', error);
            showStatus(`生成分享链接失败: ${error.message}`, 'error');
            shareLinkArea.style.display = 'none';
        }
    }

    // 复制分享链接到剪贴板... (保持不变)
    function copyShareLink(inputElement) {
        inputElement.select();
        inputElement.setSelectionRange(0, 99999);

        try {
            navigator.clipboard.writeText(inputElement.value).then(() => {
                showStatus('链接已复制到剪贴板', 'success');
            }).catch(err => {
                console.error('复制失败:', err);
                showStatus('复制失败，请手动复制', 'error');
            });
        } catch (err) {
            console.error('Clipboard API not supported:', err);
            try {
                document.execCommand('copy');
                showStatus('链接已复制到剪贴板 (通过 execCommand)', 'success');
            } catch (fallbackErr) {
                console.error('手动复制失败:', fallbackErr);
                showStatus('复制失败，请手动复制', 'error');
            }
        }
    }

    fetchAndRenderBooks();
});