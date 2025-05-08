// js/upload.js
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const status = document.getElementById('status');
    const fileNameInput = document.getElementById('fileName');
    const fileDescription = document.getElementById('description');

    let selectedFile = null;

    // 拖放事件处理
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

    // 文件选择处理
    function handleFile(file) {
    if (file.type !== 'application/pdf') {
        showStatus('请选择PDF文件', 'error');
        return;
    }
    selectedFile = file;
    
    // 自动填充文件名
    const fileName = file.name;
    fileNameInput.value = fileName; // 自动填充
    
    showStatus(`已选择文件: ${file.name}`);
    fileInput.files = new DataTransfer().files;
    }

    // 上传处理
    async function uploadFile() {
        if (!selectedFile || !fileNameInput.value.trim()) {
            showStatus('请填写文档名称并选择文件', 'error');
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
                body: formData
            });
            const result = await response.json();
            if (result.Result === "Success") {
                showStatus(`上传成功：${result.Message}`, 'success');
                resetForm();
            } else {
                // 处理业务逻辑错误
                throw new Error(result.Message);
            }

        } catch (error) {
            showStatus(`上传失败: ${error.message}`, 'error');
        } finally {
            uploadBtn.disabled = false;
        }
    }

    // 状态提示
    function showStatus(message, type = 'info') {
        status.textContent = message;
        status.className = 'status';
        if (type === 'success') status.classList.add('success');
        if (type === 'error') status.classList.add('error');
    }

    // 重置表单
    function resetForm() {
        selectedFile = null;
        fileNameInput.value = '';
        fileInput.value = '';
        fileDescription.value = '';
    }

    // 事件监听
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
        setTimeout(fetchAndRenderBooks,100);
    });
});

// 书籍列表
const sampleBooks = [
    { name: '示例文档1.pdf', path: 'pdf/sample1.pdf' },
    { name: '示例文档2.pdf', path: 'pdf/sample2.pdf' }
];

// 获取书籍列表并渲染
async function fetchAndRenderBooks() {
    const status = document.getElementById('status');
    try {
        const response = await fetch('/api/BookList');

        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }

        const books = await response.json();
        renderBooks(books);
    } catch (error) {
        console.error('获取书籍列表失败:', error);
        status.textContent = `⚠️ 无法加载书籍列表，请检查网络连接: ${error.message}`;
        status.className = 'status';
        status.classList.add('error');
    }
}

// 渲染书籍列表
function renderBooks(books) {
    const list = document.getElementById('bookList');

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
                <button class="delete-btn" onclick="handleDelete('${encodeURIComponent(book.FileName)}')">
                    删除
                </button>
            </div>
        </div>
    `).join('');
}

async function handleDelete(fileName) {
    const status = document.getElementById('status');

    if (!confirm(`确定要删除 ${decodeURIComponent(fileName) } 吗 ?`)) return;

    try {
        const response = await fetch(`/api/BookList`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                FileName: decodeURIComponent(fileName)
            })
        });

        if (!response.ok) {
            throw new Error(`删除失败: ${response.statusText}`);
        }

        // 删除成功后刷新列表
        fetchAndRenderBooks();
        alert('文件删除成功');
        status.textContent = `${decodeURIComponent(fileName)}已成功删除`;
        status.className = 'status';
        status.classList.add('success');
    } catch (error) {
        console.error('删除操作失败:', error);
        status.textContent = `${decodeURIComponent(fileName)}删除失败`;
        status.className = 'status';
        status.classList.add('error');

    }
}

// 页面加载时自动获取数据
document.addEventListener('DOMContentLoaded', fetchAndRenderBooks);


