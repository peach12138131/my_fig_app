from flask import Flask, render_template
from backend.routes import api_bp
import os

# 创建 Flask 应用
app = Flask(__name__,
            static_folder='static',
            static_url_path='/static',
            template_folder='templates')

# 配置
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB 最大上传大小
app.config['UPLOAD_FOLDER'] = './uploads'
app.config['JSON_AS_ASCII'] = False  # 支持中文 JSON

# 注册 API 蓝图
app.register_blueprint(api_bp, url_prefix='/api')


@app.route('/')
def index():
    """主页"""
    return render_template('index.html')


@app.errorhandler(413)
def request_entity_too_large(error):
    """文件过大错误处理"""
    return {'success': False, 'error': '上传文件过大，最大允许 50MB'}, 413


@app.errorhandler(404)
def not_found(error):
    """404 错误处理"""
    return {'success': False, 'error': '请求的资源不存在'}, 404


@app.errorhandler(500)
def internal_error(error):
    """500 错误处理"""
    return {'success': False, 'error': '服务器内部错误'}, 500


if __name__ == '__main__':
    # 确保输出目录存在
    os.makedirs('./fig_out', exist_ok=True)

    # 启动服务器
    print("=" * 60)
    print("MY Figure LAB - Scientific Image Generation Platform")
    print("Powered by AVI-GO AI INSIGHT")
    print("=" * 60)
    print(f"Server Address: http://localhost:8299")
    print(f"Network Access: http://0.0.0.0:8299")
    print("=" * 60)

    app.run(host='0.0.0.0', port=8299, debug=False)
