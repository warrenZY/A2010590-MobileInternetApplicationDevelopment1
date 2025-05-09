// js/share-script.js
// 引入了 PDF.js 库

// --- 获取 HTML 元素引用 ---
const fileInfoDiv = document.getElementById('fileInfo');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const fileDescriptionDisplay = document.getElementById('fileDescriptionDisplay');
const loadingMessage = document.getElementById('loading');
const errorMessage = document.getElementById('error');
const pdfViewer = document.getElementById('pdfViewer');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const currentShareLinkInput = document.getElementById('currentShareLink');
const copyLinkBtn = document.querySelector('.share-page-link-area .copy-link-btn');
const remainingTimeDisplay = document.getElementById('remainingTime');
const downloadBtn = document.getElementById('downloadBtn'); // 获取下载按钮元素

// --- 获取 URL 参数 ---
const urlParams = new URLSearchParams(window.location.search);
const shareToken = urlParams.get('token');

// --- PDF.js Worker 设置 ---
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs';

// --- 状态变量 ---
let countdownTimer = null;
let loadedFileName = null; // 存储获取到的文件名

// --- 辅助函数 ---

// 显示加载信息
function showLoading(message = '加载中...') {
    loadingMessage.textContent = message;
    loadingMessage.style.display = 'block';
    fileInfoDiv.style.display = 'none';
    errorMessage.style.display = 'none';
    pdfViewer.innerHTML = '';
    fullscreenBtn.style.display = 'none';
    remainingTimeDisplay.style.display = 'none';
    downloadBtn.style.display = 'none'; // 隐藏下载按钮
    clearInterval(countdownTimer);
}

// 显示错误信息
function showError(message) {
    errorMessage.textContent = `错误: ${message}`;
    errorMessage.style.display = 'block';
    loadingMessage.style.display = 'none';
    fileInfoDiv.style.display = 'none';
    pdfViewer.innerHTML = '';
    fullscreenBtn.style.display = 'none';
    remainingTimeDisplay.style.display = 'none';
    downloadBtn.style.display = 'none'; // 隐藏下载按钮
    clearInterval(countdownTimer);
}

// 更新剩余时间显示
function updateRemainingTime(expirationTimeUtc) {
    // 确保 expirationTimeUtc 可以转换为有效的 Date 对象
    const expirationDate = new Date(expirationTimeUtc);

    // 检查日期是否有效。如果无效，显示错误信息。
    if (isNaN(expirationDate.getTime())) {
        console.error('Invalid expiration time received:', expirationTimeUtc);
        remainingTimeDisplay.textContent = '有效时间信息无效';
        remainingTimeDisplay.style.display = 'block';
        clearInterval(countdownTimer);
        return;
    }

    // 检查是否为 "永久" 时间 (通常用一个非常大的未来日期表示)
    const permanentDate = new Date(8640000000000000);
    if (expirationDate.getTime() === permanentDate.getTime()) {
        remainingTimeDisplay.textContent = '有效时间: 永久';
        remainingTimeDisplay.style.display = 'block';
        clearInterval(countdownTimer);
        return;
    }

    const nowUtc = new Date();
    const timeDiffSeconds = Math.max(0, Math.floor((expirationDate.getTime() - nowUtc.getTime()) / 1000));

    if (timeDiffSeconds <= 0) {
        remainingTimeDisplay.textContent = '分享链接已过期';
        remainingTimeDisplay.style.display = 'block';
        clearInterval(countdownTimer);
        // 如果刚刚过期或已经过期，显示用户可见的错误
        if (timeDiffSeconds < 0 || (nowUtc.getTime() - expirationDate.getTime()) > 0) {
            showError('分享链接已过期');
        } else {
            // 如果恰好到期，只显示过期消息，不遮挡 PDF
            console.log('Share link is exactly expired.');
        }
        return;
    }

    const days = Math.floor(timeDiffSeconds / (60 * 60 * 24));
    const hours = Math.floor((timeDiffSeconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((timeDiffSeconds % (60 * 60)) / 60);
    const seconds = timeDiffSeconds % 60;

    let timeString = '有效时间: ';
    if (days > 0) timeString += `${days}天`;
    if (hours > 0 || days > 0) timeString += `${hours}小时`;
    if (minutes > 0 || hours > 0 || days > 0) timeString += `${minutes}分`;
    timeString += `${seconds}秒`;

    remainingTimeDisplay.textContent = timeString;
    remainingTimeDisplay.style.display = 'block';
}

// 获取文件信息并加载 PDF
async function fetchFileInfoAndLoadPdf() {
    if (!shareToken) {
        showError('分享码缺失');
        return;
    }

    showLoading('获取文件信息...');

    try {
        const infoResponse = await fetch(`/api/share/status/${shareToken}`);

        if (!infoResponse.ok) {
            const errorBody = await infoResponse.json();
            showError(errorBody.Message || `HTTP错误! 状态码: ${infoResponse.status}`);
            return;
        }

        const fileInfo = await infoResponse.json();

        // --- 调试信息: 打印接收到的 fileInfo 对象 ---
        console.log("Received fileInfo:", fileInfo);
        // --- 调试信息结束 ---

        if (fileInfo.Success) {
            // 存储文件名
            loadedFileName = fileInfo.FileName;

            fileNameDisplay.textContent = loadedFileName;
            fileDescriptionDisplay.textContent = fileInfo.Message || '无描述';
            // 修正：移除设置 display 为 flex 的代码，让 CSS 类 .file-info 决定其显示方式 (通常是 block)
            fileInfoDiv.style.display = 'block'; // 确保容器显示

            // 在成功获取文件信息后显示下载按钮
            downloadBtn.style.display = 'block';

            // --- 处理日期 ---
            // 确保从后端接收到的 ExpirationTime 可以被 new Date() 正确解析
            const expirationDate = new Date(fileInfo.ExpirationTime);

            // 在继续之前检查解析后的日期是否有效
            if (isNaN(expirationDate.getTime())) {
                console.error('Invalid ExpirationTime received from backend:', fileInfo.ExpirationTime);
                // 即使时间无效，仍然显示文件信息和下载按钮
                remainingTimeDisplay.textContent = '有效时间信息无效';
                remainingTimeDisplay.style.display = 'block';
            } else {
                updateRemainingTime(fileInfo.ExpirationTime);

                const permanentDate = new Date(8640000000000000);
                // 如果不是永久有效且日期有效，才开始倒计时
                if (expirationDate.getTime() !== permanentDate.getTime()) {
                    countdownTimer = setInterval(() => updateRemainingTime(fileInfo.ExpirationTime), 1000);
                }
            }
            // --- 日期处理结束 ---


            loadingMessage.textContent = '加载PDF中...';

            const pdfUrl = `/api/share/file/${shareToken}`;

            try {
                const response = await fetch(pdfUrl);

                if (!response.ok) {
                    // Attempt to read error message from response body if available
                    let errorMsg = `HTTP错误! 状态码: ${response.status}`;
                    try {
                        const errorBody = await response.json();
                        errorMsg = errorBody.Message || errorMsg;
                    } catch (jsonError) {
                        console.warn("Could not parse error response body as JSON:", jsonError);
                    }
                    throw new Error(errorMsg);
                }

                const pdfBlob = await response.blob();

                // Directly use ArrayBuffer to load PDF
                const pdfData = await pdfBlob.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: pdfData });
                const pdf = await loadingTask.promise;

                pdfViewer.innerHTML = ''; // Clear previous content

                // Render pages
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const scale = 1.5; // Adjust scale as needed
                    const viewport = page.getViewport({ scale: scale });

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    canvas.style.display = 'block'; // Prevent extra space below canvas
                    pdfViewer.appendChild(canvas);

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    await page.render(renderContext).promise;
                }

                console.log('PDF 渲染完成');
                loadingMessage.style.display = 'none';
                fullscreenBtn.style.display = 'block'; // Show fullscreen button after PDF loads

            } catch (error) {
                console.error('加载或渲染 PDF 失败:', error);
                showError(`加载文件失败: ${error.message}`);
                fullscreenBtn.style.display = 'none'; // Hide fullscreen button on error
            }

        } else {
            showError(fileInfo.Message || '获取文件信息失败');
            downloadBtn.style.display = 'none'; // Hide download button on error
        }

    } catch (error) {
        console.error('获取文件信息失败:', error);
        showError(`获取文件信息失败: ${error.message}`);
        downloadBtn.style.display = 'none'; // Hide download button on error
    }
}

// 处理下载逻辑
function handleDownload() {
    if (!shareToken || !loadedFileName) {
        console.error("Cannot download: share token or file name is missing.");
        alert("无法下载文件，信息不完整。"); // 给用户提示
        return;
    }

    const downloadUrl = `/api/share/file/${shareToken}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = loadedFileName; // 设置下载文件名

    // 某些浏览器需要将链接添加到 body 才能触发下载
    document.body.appendChild(link);

    // 触发点击下载
    link.click();

    // 下载触发后移除临时链接
    setTimeout(() => {
        document.body.removeChild(link);
    }, 100); // 延迟移除，确保下载开始

    console.log(`Attempting to download: ${loadedFileName} from ${downloadUrl}`);
}

// 备用复制到剪贴板函数
function fallbackCopyTextToClipboard(text) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    // 避免滚动到页面底部
    tempInput.style.top = "0";
    tempInput.style.left = "0";
    tempInput.style.position = "fixed";

    document.body.appendChild(tempInput);
    tempInput.focus();
    tempInput.select();

    try {
        const successful = document.execCommand('copy');
        const msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
        if (successful) {
            alert('分享链接已复制到剪贴板 (备用方法)');
        } else {
            alert('复制失败，请手动复制');
        }
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        alert('复制失败，请手动复制');
    }

    document.body.removeChild(tempInput);
}


// 复制当前分享链接到剪贴板
function copyCurrentShareLink() {
    const shareLink = window.location.href;

    // 修正：在使用 navigator.clipboard 之前检查它是否存在
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareLink).then(() => {
            alert('分享链接已复制到剪贴板');
        }).catch(err => {
            console.error('Clipboard API copy failed:', err);
            // Clipboard API 失败时，回退到备用方法
            fallbackCopyTextToClipboard(shareLink);
        });
    } else {
        console.warn('Clipboard API not available or not in a secure context, falling back to execCommand.');
        // Clipboard API 不可用时，直接使用备用方法
        fallbackCopyTextToClipboard(shareLink);
    }
}

// 全屏切换
function toggleFullscreen() {
    const elem = pdfViewer; // 需要全屏的元素

    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) { /* Firefox */
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE/Edge */
            elem.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    }
}

// 全屏状态改变时的处理 (可选，用于根据全屏状态调整 UI)
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('msfullscreenchange', handleFullscreenChange);

function handleFullscreenChange() {
    if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
        console.log('Entered fullscreen');
        // 可以添加类或样式来调整全屏时的布局
        // document.body.classList.add('fullscreen-active');
    } else {
        console.log('Exited fullscreen');
        // 移除全屏时的类或样式
        // document.body.classList.remove('fullscreen-active');
    }
}

// 检查在线状态 (可选)
function checkOnlineStatus() {
    if (!navigator.onLine) {
        console.warn('App is currently offline');
        // 如果有通用的状态消息显示区域，可以使用它
        // showStatusMessage('当前处于离线状态，部分功能可能受限', 'warning');
    } else {
        console.log('App is currently online');
        // 如果显示过离线警告，可以清除它
        // hideStatusMessage('warning');
    }
}

// 假定您有一个通用的状态消息显示函数 (如果需要的话)
function showStatusMessage(message, type = 'info') {
    // 根据您的 HTML 结构实现一个通用的状态消息显示
    console.log(`Status [${type}]: ${message}`);
    // Example: const generalStatusDiv = document.getElementById('generalStatus');
    // if(generalStatusDiv) { generalStatusDiv.textContent = message; generalStatusDiv.className = type; }
}


// --- DOMContentLoaded 事件监听器 ---
// 页面加载完成后执行的初始化代码
document.addEventListener('DOMContentLoaded', () => {
    console.log("share-script.js DOMContentLoaded");

    // 初始获取文件信息并加载 PDF
    fetchFileInfoAndLoadPdf();

    // 设置分享链接输入框的值
    if (currentShareLinkInput) {
        currentShareLinkInput.value = window.location.href;
    } else {
        console.warn("Element with id 'currentShareLink' not found.");
    }


    // 为复制按钮添加事件监听器
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyCurrentShareLink);
    } else {
        console.warn("Element with class 'copy-link-btn' not found.");
    }


    // 为全屏按钮添加事件监听器
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    } else {
        console.warn("Element with id 'fullscreenBtn' not found.");
    }

    // 为下载按钮添加事件监听器
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    } else {
        console.warn("Element with id 'downloadBtn' not found.");
    }


    // 初始检查在线状态
    checkOnlineStatus();
});

// --- 窗口事件监听器 ---
// 监听在线/离线事件
window.addEventListener('online', checkOnlineStatus);
window.addEventListener('offline', checkOnlineStatus);

// 在页面即将卸载时清除定时器
window.addEventListener('beforeunload', () => {
    clearInterval(countdownTimer);
});

// 如果需要在窗口大小改变时重新渲染 PDF，可以添加监听器并实现 handleResize 函数
// window.addEventListener('resize', handleResize);