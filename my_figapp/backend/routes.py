from flask import Blueprint, request, jsonify, send_file, send_from_directory
import os
import glob
import tempfile
import zipfile
from io import BytesIO
from werkzeug.utils import secure_filename
from backend.image_generator import generate_image

# 创建蓝图
api_bp = Blueprint('api', __name__)

# 允许的文件扩展名
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def sanitize_folder_type(folder_type):
    """清理文件夹名称，防止路径遍历"""
    # 移除任何路径分隔符和特殊字符
    return secure_filename(folder_type).replace('.', '_')


@api_bp.route('/generate', methods=['POST'])
def generate():
    """生成图片 API"""
    try:
        # 获取表单数据
        prompt = request.form.get('prompt', '').strip()
        folder_type = request.form.get('folder_type', '').strip()
        image_size = request.form.get('image_size', '2K')

        # 验证必填字段
        if not prompt:
            return jsonify({'success': False, 'error': '请输入生成提示词'}), 400
        if not folder_type:
            return jsonify({'success': False, 'error': '请输入子文件夹名称'}), 400

        # 清理文件夹名称
        folder_type = sanitize_folder_type(folder_type)

        # 验证图片尺寸
        if image_size not in ['2K', '4K']:
            image_size = '2K'

        # 处理上传的参考图片
        reference_files = []
        temp_files = []
        try:
            uploaded_files = request.files.getlist('reference_images[]')
            if uploaded_files and uploaded_files[0].filename:  # 确保有实际文件
                for file in uploaded_files[:5]:  # 最多5张
                    if file and allowed_file(file.filename):
                        # 保存到临时文件
                        temp_path = os.path.join(
                            tempfile.gettempdir(),
                            secure_filename(file.filename)
                        )
                        file.save(temp_path)
                        reference_files.append(temp_path)
                        temp_files.append(temp_path)

            # 调用图片生成函数
            success, jpg_path, message = generate_image(
                prompt, folder_type, image_size, reference_files
            )

            if success:
                # 转换为 web 路径
                web_path = jpg_path.replace('\\', '/').replace('./fig_out/', '/api/image/')
                return jsonify({
                    'success': True,
                    'jpg_path': web_path,
                    'message': message
                })
            else:
                return jsonify({'success': False, 'error': message}), 500

        finally:
            # 清理临时文件
            for temp_file in temp_files:
                try:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                except:
                    pass

    except Exception as e:
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500


@api_bp.route('/gallery/<folder_type>', methods=['GET'])
def gallery(folder_type):
    """加载相册 API"""
    try:
        # 清理文件夹名称
        folder_type = sanitize_folder_type(folder_type)

        if not folder_type:
            return jsonify({'success': False, 'error': '请输入子文件夹名称'}), 400

        output_dir = f"./fig_out/{folder_type}"
        if not os.path.exists(output_dir):
            return jsonify({
                'success': False,
                'error': f'文件夹 {folder_type} 不存在'
            }), 404

        # 获取所有 JPG 图片
        jpg_files = sorted(glob.glob(f"{output_dir}/*.jpg"), reverse=True)

        if not jpg_files:
            return jsonify({
                'success': True,
                'images': [],
                'count': 0,
                'message': f'文件夹 {folder_type} 中没有图片'
            })

        # 构建图片信息列表
        images = []
        for jpg_path in jpg_files:
            filename = os.path.basename(jpg_path)
            # 提取时间戳
            timestamp = ''
            if '_' in filename:
                parts = filename.split('_')
                if len(parts) >= 3:
                    timestamp = f"{parts[-2]}_{parts[-1].replace('.jpg', '')}"

            images.append({
                'jpg_path': f'/api/image/{folder_type}/{filename}',
                'filename': filename,
                'timestamp': timestamp
            })

        return jsonify({
            'success': True,
            'images': images,
            'count': len(images),
            'message': f'找到 {len(images)} 张图片'
        })

    except Exception as e:
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500


@api_bp.route('/image/<folder_type>/<filename>', methods=['GET'])
def serve_image(folder_type, filename):
    """提供图片文件"""
    try:
        # 清理文件夹名称和文件名
        folder_type = sanitize_folder_type(folder_type)
        filename = secure_filename(filename)

        image_dir = os.path.join('./fig_out', folder_type)
        image_path = os.path.join(image_dir, filename)

        if not os.path.exists(image_path):
            return jsonify({'success': False, 'error': '图片不存在'}), 404

        return send_from_directory(image_dir, filename)

    except Exception as e:
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500


@api_bp.route('/download-originals/<folder_type>', methods=['GET'])
def download_originals(folder_type):
    """下载原图 ZIP"""
    try:
        # 清理文件夹名称
        folder_type = sanitize_folder_type(folder_type)

        if not folder_type:
            return jsonify({'success': False, 'error': '请输入子文件夹名称'}), 400

        output_dir = f"./fig_out/{folder_type}"
        if not os.path.exists(output_dir):
            return jsonify({'success': False, 'error': f'文件夹 {folder_type} 不存在'}), 404

        # 获取所有 PNG 原图
        png_files = sorted(glob.glob(f"{output_dir}/*.png"), reverse=True)

        if not png_files:
            return jsonify({'success': False, 'error': f'文件夹 {folder_type} 中没有原图'}), 404

        # 创建内存 ZIP 文件
        memory_file = BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for png_path in png_files:
                zf.write(png_path, os.path.basename(png_path))

        memory_file.seek(0)

        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'{folder_type}_originals.zip'
        )

    except Exception as e:
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500


@api_bp.route('/folders', methods=['GET'])
def list_folders():
    """列出所有可用的文件夹"""
    try:
        fig_out_dir = './fig_out'
        if not os.path.exists(fig_out_dir):
            return jsonify({'success': True, 'folders': []})

        folders = [
            d for d in os.listdir(fig_out_dir)
            if os.path.isdir(os.path.join(fig_out_dir, d))
        ]

        return jsonify({'success': True, 'folders': sorted(folders)})

    except Exception as e:
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500
