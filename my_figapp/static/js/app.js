/**
 * 主应用逻辑
 * 初始化和事件处理
 */

// 全局状态
let selectedFiles = [];
const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 10;

/**
 * DOM 加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initGenerateForm();
    initGallery();
    initLightbox();
});

/**
 * 初始化 Tab 切换
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // 移除所有 active 类
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // 添加 active 到当前 tab
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

/**
 * 初始化生成表单
 */
function initGenerateForm() {
    const form = document.getElementById('generateForm');
    const fileInput = document.getElementById('referenceImages');
    const filePreview = document.getElementById('filePreview');

    // 文件选择处理
    fileInput.addEventListener('change', (e) => {
        handleFileSelection(e.target.files);
    });

    // 表单提交
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleGenerateSubmit();
    });

    /**
     * 处理文件选择
     */
    function handleFileSelection(files) {
        filePreview.innerHTML = '';
        selectedFiles = [];

        if (files.length === 0) return;

        // 限制最多5张
        const filesToProcess = Array.from(files).slice(0, MAX_FILES);

        filesToProcess.forEach((file, index) => {
            // 验证文件类型
            if (!UI.validateFileType(file)) {
                UI.showToast(`${file.name} 不是有效的图片格式`, 'error');
                return;
            }

            // 验证文件大小
            if (!UI.validateFileSize(file, MAX_FILE_SIZE_MB)) {
                UI.showToast(`${file.name} 超过 ${MAX_FILE_SIZE_MB}MB 限制`, 'error');
                return;
            }

            selectedFiles.push(file);
            const previewItem = UI.createFilePreviewItem(file, index);
            filePreview.appendChild(previewItem);
        });

        if (selectedFiles.length > 0) {
            UI.showToast(`已选择 ${selectedFiles.length} 张图片`, 'success');
        }
    }

    /**
     * 处理生成提交
     */
    async function handleGenerateSubmit() {
        const prompt = document.getElementById('prompt').value.trim();
        const folderType = document.getElementById('folderType').value.trim();
        const imageSize = document.getElementById('imageSize').value;
        const generateBtn = document.getElementById('generateBtn');
        const statusElement = document.getElementById('generateStatus');
        const previewContainer = document.getElementById('imagePreview');

        // 验证必填字段
        if (!prompt) {
            UI.showError(statusElement, '请输入生成提示词');
            return;
        }

        if (!folderType) {
            UI.showError(statusElement, '请输入子文件夹名称');
            return;
        }

        // 构建 FormData
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('folder_type', folderType);
        formData.append('image_size', imageSize);

        // 添加参考图片
        selectedFiles.forEach(file => {
            formData.append('reference_images[]', file);
        });

        try {
            // 显示加载状态
            UI.setButtonLoading(generateBtn, true);
            UI.showLoading(statusElement, '正在生成图片，请稍候...');

            // 重置预览
            previewContainer.innerHTML = `
                <img src="/static/images/Placeholder.jpg" alt="生成中" class="placeholder-image">
                <p class="preview-hint">图片生成中，请耐心等待...</p>
            `;

            // 调用 API
            const result = await API.generateImage(formData);

            if (result.success) {
                // 显示生成的图片
                previewContainer.innerHTML = `
                    <img src="${result.jpg_path}" alt="生成的图片">
                `;

                UI.showSuccess(statusElement, result.message);
                UI.showToast('图片生成成功！', 'success');

                // 清空文件选择
                document.getElementById('referenceImages').value = '';
                filePreview.innerHTML = '';
                selectedFiles = [];
            } else {
                throw new Error(result.error || '生成失败');
            }

        } catch (error) {
            console.error('Generate error:', error);
            UI.showError(statusElement, `生成失败: ${error.message}`);
            UI.showToast('图片生成失败', 'error');

            // 显示错误状态
            previewContainer.innerHTML = `
                <img src="/static/images/Error_image.jpg" alt="生成失败" style="max-height: 300px; opacity: 0.5;">
                <p class="preview-hint" style="color: var(--color-error);">生成失败，请重试</p>
            `;

        } finally {
            UI.setButtonLoading(generateBtn, false);
        }
    }
}

/**
 * 初始化相册功能
 */
function initGallery() {
    const loadBtn = document.getElementById('loadGalleryBtn');
    const downloadBtn = document.getElementById('downloadOriginalsBtn');

    loadBtn.addEventListener('click', handleLoadGallery);
    downloadBtn.addEventListener('click', handleDownloadOriginals);

    /**
     * 加载相册
     */
    async function handleLoadGallery() {
        const folderType = document.getElementById('galleryFolder').value.trim();
        const statusElement = document.getElementById('galleryStatus');
        const galleryGrid = document.getElementById('galleryGrid');

        if (!folderType) {
            UI.showError(statusElement, '请输入子文件夹名称');
            return;
        }

        try {
            UI.setButtonLoading(loadBtn, true);
            UI.showLoading(statusElement, '正在加载相册...');

            // 显示加载占位符
            galleryGrid.innerHTML = '';
            for (let i = 0; i < 8; i++) {
                const placeholder = document.createElement('div');
                placeholder.className = 'gallery-item';
                placeholder.innerHTML = '<img src="/static/images/Placeholder.jpg" alt="加载中" style="opacity: 0.3;">';
                galleryGrid.appendChild(placeholder);
            }

            // 调用 API
            const result = await API.loadGallery(folderType);

            if (result.success) {
                galleryGrid.innerHTML = '';

                if (result.images && result.images.length > 0) {
                    // 渲染图片
                    result.images.forEach(image => {
                        const item = UI.createGalleryItem(image);
                        galleryGrid.appendChild(item);
                    });

                    UI.showSuccess(statusElement, result.message);
                    UI.showToast(`加载了 ${result.count} 张图片`, 'success');
                } else {
                    // 空状态
                    galleryGrid.appendChild(
                        UI.createEmptyState('该文件夹中没有图片')
                    );
                    UI.showInfo(statusElement, result.message || '文件夹为空');
                }
            } else {
                throw new Error(result.error || '加载失败');
            }

        } catch (error) {
            console.error('Load gallery error:', error);
            UI.showError(statusElement, `加载失败: ${error.message}`);
            UI.showToast('加载相册失败', 'error');

            galleryGrid.innerHTML = '';
            galleryGrid.appendChild(
                UI.createErrorState(error.message)
            );

        } finally {
            UI.setButtonLoading(loadBtn, false);
        }
    }

    /**
     * 下载原图
     */
    async function handleDownloadOriginals() {
        const folderType = document.getElementById('galleryFolder').value.trim();
        const statusElement = document.getElementById('galleryStatus');

        if (!folderType) {
            UI.showError(statusElement, '请输入子文件夹名称');
            return;
        }

        try {
            UI.setButtonLoading(downloadBtn, true);
            UI.showLoading(statusElement, '正在准备下载...');

            // 调用 API
            const blob = await API.downloadOriginals(folderType);

            // 触发下载
            UI.triggerDownload(blob, `${folderType}_originals.zip`);

            UI.showSuccess(statusElement, '下载已开始！');
            UI.showToast('开始下载原图', 'success');

        } catch (error) {
            console.error('Download error:', error);
            UI.showError(statusElement, `下载失败: ${error.message}`);
            UI.showToast('下载失败', 'error');

        } finally {
            UI.setButtonLoading(downloadBtn, false);
        }
    }
}

/**
 * 初始化 Lightbox
 */
function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const closeBtn = document.querySelector('.lightbox-close');

    // 点击关闭按钮
    closeBtn.addEventListener('click', () => {
        UI.closeLightbox();
    });

    // 点击背景关闭
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            UI.closeLightbox();
        }
    });

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            UI.closeLightbox();
        }
    });
}
