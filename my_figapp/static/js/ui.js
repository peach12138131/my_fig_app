/**
 * UI 工具函数
 * 可复用的 UI 组件和辅助函数
 */

const UI = {
    /**
     * 显示加载状态
     * @param {HTMLElement} element - 目标元素
     * @param {string} message - 加载消息
     */
    showLoading(element, message = '加载中...') {
        element.className = 'status-box loading visible';
        element.textContent = message;
    },

    /**
     * 显示成功消息
     * @param {HTMLElement} element - 目标元素
     * @param {string} message - 成功消息
     */
    showSuccess(element, message) {
        element.className = 'status-box success visible';
        element.textContent = message;
    },

    /**
     * 显示错误消息
     * @param {HTMLElement} element - 目标元素
     * @param {string} message - 错误消息
     */
    showError(element, message) {
        element.className = 'status-box error visible';
        element.textContent = message;
    },

    /**
     * 显示信息消息
     * @param {HTMLElement} element - 目标元素
     * @param {string} message - 信息消息
     */
    showInfo(element, message) {
        element.className = 'status-box info visible';
        element.textContent = message;
    },

    /**
     * 隐藏状态框
     * @param {HTMLElement} element - 目标元素
     */
    hideStatus(element) {
        element.className = 'status-box';
        element.textContent = '';
    },

    /**
     * 显示 Toast 通知
     * @param {string} message - 通知消息
     * @param {string} type - 类型 (success, error, info)
     */
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} visible`;

        // 3秒后自动隐藏
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    },

    /**
     * 验证文件大小
     * @param {File} file - 文件对象
     * @param {number} maxSizeMB - 最大文件大小（MB）
     * @returns {boolean}
     */
    validateFileSize(file, maxSizeMB = 10) {
        const maxBytes = maxSizeMB * 1024 * 1024;
        return file.size <= maxBytes;
    },

    /**
     * 验证文件类型
     * @param {File} file - 文件对象
     * @returns {boolean}
     */
    validateFileType(file) {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        return validTypes.includes(file.type);
    },

    /**
     * 触发文件下载
     * @param {Blob} blob - 文件 Blob
     * @param {string} filename - 文件名
     */
    triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * 格式化时间戳
     * @param {string} timestamp - 时间戳字符串 (YYYYMMDD_HHMM)
     * @returns {string}
     */
    formatTimestamp(timestamp) {
        if (!timestamp || timestamp.length < 13) return timestamp;

        try {
            const dateStr = timestamp.substring(0, 8);  // YYYYMMDD
            const timeStr = timestamp.substring(9, 13); // HHMM

            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const hour = timeStr.substring(0, 2);
            const minute = timeStr.substring(2, 4);

            return `${year}-${month}-${day} ${hour}:${minute}`;
        } catch (error) {
            return timestamp;
        }
    },

    /**
     * 创建文件预览项
     * @param {File} file - 文件对象
     * @param {number} index - 文件索引
     * @returns {HTMLElement}
     */
    createFilePreviewItem(file, index) {
        const div = document.createElement('div');
        div.className = 'file-preview-item';
        div.dataset.index = index;

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = file.name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'file-preview-remove';
        removeBtn.textContent = '×';
        removeBtn.title = '移除';
        removeBtn.onclick = (e) => {
            e.preventDefault();
            div.remove();
        };

        div.appendChild(img);
        div.appendChild(removeBtn);

        return div;
    },

    /**
     * 创建相册项
     * @param {Object} image - 图片对象 {jpg_path, filename, timestamp}
     * @returns {HTMLElement}
     */
    createGalleryItem(image) {
        const div = document.createElement('div');
        div.className = 'gallery-item';

        const img = document.createElement('img');
        img.src = image.jpg_path;
        img.alt = image.filename;
        img.loading = 'lazy';
        img.onclick = () => this.openLightbox(image.jpg_path, image.filename);

        const info = document.createElement('div');
        info.className = 'image-info';
        info.innerHTML = `
            <span class="timestamp">${this.formatTimestamp(image.timestamp)}</span>
        `;

        div.appendChild(img);
        div.appendChild(info);

        return div;
    },

    /**
     * 创建原图列表项
     * @param {Object} original - 原图对象 {filename, size_str, download_url}
     * @returns {HTMLElement}
     */
    createOriginalItem(original) {
        const div = document.createElement('div');
        div.className = 'original-item';

        const icon = document.createElement('span');
        icon.className = 'original-icon';
        icon.textContent = '📄';

        const info = document.createElement('div');
        info.className = 'original-info';

        const filename = document.createElement('div');
        filename.className = 'original-filename';
        filename.textContent = original.filename;
        filename.title = original.filename;

        const size = document.createElement('div');
        size.className = 'original-size';
        size.textContent = original.size_str;

        info.appendChild(filename);
        info.appendChild(size);

        const downloadBtn = document.createElement('a');
        downloadBtn.className = 'original-download';
        downloadBtn.href = original.download_url;
        downloadBtn.download = original.filename;
        downloadBtn.textContent = '下载';
        downloadBtn.title = '下载';

        div.appendChild(icon);
        div.appendChild(info);
        div.appendChild(downloadBtn);

        return div;
    },

    /**
     * 打开 Lightbox 查看大图
     * @param {string} imagePath - 图片路径
     * @param {string} caption - 图片说明
     */
    openLightbox(imagePath, caption = '') {
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightboxImage');
        const lightboxCaption = document.getElementById('lightboxCaption');

        lightboxImg.src = imagePath;
        lightboxCaption.textContent = caption;
        lightbox.className = 'lightbox active';
    },

    /**
     * 关闭 Lightbox
     */
    closeLightbox() {
        const lightbox = document.getElementById('lightbox');
        lightbox.className = 'lightbox';
    },

    /**
     * 创建空状态显示
     * @param {string} message - 提示消息
     * @returns {HTMLElement}
     */
    createEmptyState(message) {
        const div = document.createElement('div');
        div.className = 'empty-state';
        div.innerHTML = `
            <img src="/static/images/Placeholder.jpg" alt="空状态" class="empty-image">
            <p>${message}</p>
        `;
        return div;
    },

    /**
     * 创建错误状态显示
     * @param {string} message - 错误消息
     * @returns {HTMLElement}
     */
    createErrorState(message) {
        const div = document.createElement('div');
        div.className = 'empty-state';
        div.innerHTML = `
            <img src="/static/images/Error_image.jpg" alt="错误" class="empty-image">
            <p style="color: var(--color-error);">${message}</p>
        `;
        return div;
    },

    /**
     * 设置按钮加载状态
     * @param {HTMLElement} button - 按钮元素
     * @param {boolean} loading - 是否加载中
     */
    setButtonLoading(button, loading) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    },

    /**
     * 启动进度条动画
     * @param {number} estimatedSeconds - 预估完成时间（秒）
     * @returns {Object} 动画控制对象
     */
    startProgressAnimation(estimatedSeconds = 60) {
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.querySelector('.progress-percent');

        if (!progressFill || !progressPercent) {
            return { stop: () => {}, complete: () => {} };
        }

        let progress = 0;
        const maxProgress = 90; // 最多到90%，剩下10%等API完成
        const updateInterval = 200; // 每200ms更新一次
        const totalUpdates = (estimatedSeconds * 1000) / updateInterval;
        const progressPerUpdate = maxProgress / totalUpdates;

        const interval = setInterval(() => {
            if (progress < maxProgress) {
                progress += progressPerUpdate;
                const displayProgress = Math.min(Math.floor(progress), maxProgress);

                progressFill.style.width = `${displayProgress}%`;
                progressPercent.textContent = `${displayProgress}%`;
            }
        }, updateInterval);

        return {
            stop: () => clearInterval(interval),
            complete: () => {
                clearInterval(interval);
                progressFill.style.width = '100%';
                progressPercent.textContent = '100%';
            }
        };
    },

    /**
     * 完成进度条
     * @param {Object} progressAnimation - 进度动画对象
     */
    completeProgress(progressAnimation) {
        if (progressAnimation && progressAnimation.complete) {
            progressAnimation.complete();
        }
    }
};
