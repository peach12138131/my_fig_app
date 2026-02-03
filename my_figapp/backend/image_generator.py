import requests
import base64
import os
from datetime import datetime
from PIL import Image
from config import GEMINI_API_KEY


def generate_image(prompt, folder_type, image_size, reference_files=None):
    """
    生成图片并保存为 PNG 和 JPG 格式

    Args:
        prompt: 图片生成提示词
        folder_type: 子文件夹名称
        image_size: 图片尺寸 ("2K" or "4K")
        reference_files: 参考图片文件路径列表（最多5张）

    Returns:
        tuple: (success: bool, jpg_path: str or None, message: str)
    """
    try:
        # 创建输出目录
        output_dir = f"./fig_out/{folder_type}"
        os.makedirs(output_dir, exist_ok=True)

        # 生成时间戳文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        base_filename = f"image_{folder_type}_{timestamp}"
        png_path = f"{output_dir}/{base_filename}.png"
        jpg_path = f"{output_dir}/{base_filename}.jpg"

        # 构建 API 请求
        parts = [{"text": prompt}]

        # 处理参考图片
        if reference_files:
            for file_path in reference_files[:5]:  # 最多5张
                if os.path.exists(file_path):
                    with open(file_path, "rb") as f:
                        img_data = base64.b64encode(f.read()).decode()
                    parts.append({
                        "inline_data": {
                            "mimeType": "image/png",
                            "data": img_data
                        }
                    })

        # 发送请求到 Gemini API
        payload = {
            "contents": [{
                "parts": parts
            }],
            "tools": [{"googleSearch": {}}],
            "generationConfig": {
                "imageConfig": {
                    "imageSize": image_size
                }
            }
        }

        response = requests.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
            headers={
                "x-goog-api-key": GEMINI_API_KEY,
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=120
        )
        response.raise_for_status()

        # 提取图片数据
        result = response.json()
        image_data = None

        if 'candidates' in result and len(result['candidates']) > 0:
            parts = result['candidates'][0].get('content', {}).get('parts', [])
            for part in parts:
                if 'inlineData' in part:
                    image_data = part['inlineData'].get('data')
                    break

        if not image_data:
            return False, None, f"生成失败：未找到图片数据。响应: {result}"

        # 保存原始 PNG
        image_bytes = base64.b64decode(image_data)
        with open(png_path, "wb") as f:
            f.write(image_bytes)

        # 压缩为 JPG（使用 Pillow）
        compress_to_jpg(png_path, jpg_path, quality=80, max_width=1200)

        return True, jpg_path, f"生成成功！保存在 {output_dir}/"

    except requests.exceptions.RequestException as e:
        return False, None, f"API 请求错误: {str(e)}"
    except Exception as e:
        return False, None, f"错误: {str(e)}"


def compress_to_jpg(png_path, jpg_path, quality=80, max_width=1200):
    """
    使用 Pillow 将 PNG 压缩为 JPG

    Args:
        png_path: PNG 源文件路径
        jpg_path: JPG 目标文件路径
        quality: JPG 质量 (0-100)
        max_width: 最大宽度（保持宽高比）
    """
    with Image.open(png_path) as img:
        # 调整尺寸
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        # 转换 RGBA 到 RGB（如果需要）
        if img.mode == 'RGBA':
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[3])
            img = rgb_img
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # 保存为 JPG
        img.save(jpg_path, 'JPEG', quality=quality, optimize=True)
