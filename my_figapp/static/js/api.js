/**
 * API 通信层
 * 处理所有与后端的 HTTP 请求
 */

const API = {
    /**
     * 生成图片
     * @param {FormData} formData - 包含 prompt, folder_type, image_size, reference_images[]
     * @returns {Promise<Object>}
     */
    async generateImage(formData) {
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '生成请求失败');
            }

            return await response.json();
        } catch (error) {
            console.error('Generate image error:', error);
            throw error;
        }
    },

    /**
     * 加载相册
     * @param {string} folderType - 文件夹名称
     * @returns {Promise<Object>}
     */
    async loadGallery(folderType) {
        try {
            const response = await fetch(`/api/gallery/${encodeURIComponent(folderType)}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '加载相册失败');
            }

            return await response.json();
        } catch (error) {
            console.error('Load gallery error:', error);
            throw error;
        }
    },

    /**
     * 下载原图 ZIP
     * @param {string} folderType - 文件夹名称
     * @returns {Promise<Blob>}
     */
    async downloadOriginals(folderType) {
        try {
            const response = await fetch(`/api/download-originals/${encodeURIComponent(folderType)}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '下载失败');
            }

            return await response.blob();
        } catch (error) {
            console.error('Download originals error:', error);
            throw error;
        }
    },

    /**
     * 获取可用文件夹列表
     * @returns {Promise<Object>}
     */
    async getFolders() {
        try {
            const response = await fetch('/api/folders');

            if (!response.ok) {
                throw new Error('获取文件夹列表失败');
            }

            return await response.json();
        } catch (error) {
            console.error('Get folders error:', error);
            throw error;
        }
    }
};
