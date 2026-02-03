import gradio as gr
import requests
import base64
import subprocess
import os
from datetime import datetime
import glob
from config import GEMINI_API_KEY



def generate_image(prompt, folder_type, image_size, uploaded_files):
    try:
        # 创建目录
        output_dir = f"./fig_out/{folder_type}"
        os.makedirs(output_dir, exist_ok=True)
        
        # 生成时间戳文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        base_filename = f"image_{folder_type}_{timestamp}"
        png_path = f"{output_dir}/{base_filename}.png"
        jpg_path = f"{output_dir}/{base_filename}.jpg"
        
        # 构建 API 请求
        parts = [{"text": prompt}]
        
        # 处理上传的图片
        if uploaded_files:
            for file in uploaded_files[:5]:  # 最多5张
                with open(file.name, "rb") as f:
                    img_data = base64.b64encode(f.read()).decode()
                parts.append({
                    "inline_data": {  # 改为驼峰命名
                        "mimeType": "image/png",  # 改为驼峰命名
                        "data": img_data
                    }
                })
        
        # 发送请求
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
            json=payload
        )
        response.raise_for_status()
        
        # 提取图片数据
        result = response.json()
        image_data = None
        
        if 'candidates' in result and len(result['candidates']) > 0:
            parts = result['candidates'][0].get('content', {}).get('parts', [])
            for part in parts:
                if 'inlineData' in part:  # 改为驼峰命名
                    image_data = part['inlineData'].get('data')
                    break
        
        if not image_data:
            return None, f"生成失败：未找到图片数据。响应: {result}"
        
        # 保存原始 PNG
        image_bytes = base64.b64decode(image_data)
        with open(png_path, "wb") as f:
            f.write(image_bytes)
        
        # 压缩为 JPG
        subprocess.run([
            "convert",
            png_path,
            "-quality", "80",
            "-resize", "1200x",
            jpg_path
        ], check=True)
        
        return jpg_path, f"生成成功！保存在 {output_dir}/"
        
    except Exception as e:
        return None, f"错误: {str(e)}"

def load_gallery(folder_type):
    try:
        if not folder_type:
            return [], "请输入子文件夹名称"
        
        output_dir = f"./fig_out/{folder_type}"
        if not os.path.exists(output_dir):
            return [], f"文件夹 {folder_type} 不存在"
        
        # 获取所有 JPG 图片（用于预览）
        jpg_files = sorted(glob.glob(f"{output_dir}/*.jpg"), reverse=True)
        
        if not jpg_files:
            return [], f"文件夹 {folder_type} 中没有图片"
        
        return jpg_files, f"找到 {len(jpg_files)} 张图片"
        
    except Exception as e:
        return [], f"错误: {str(e)}"

def get_original_files(folder_type):
    try:
        if not folder_type:
            return None, "请输入子文件夹名称"
        
        output_dir = f"./fig_out/{folder_type}"
        if not os.path.exists(output_dir):
            return None, f"文件夹 {folder_type} 不存在"
        
        # 获取所有 PNG 原图
        png_files = sorted(glob.glob(f"{output_dir}/*.png"), reverse=True)
        
        if not png_files:
            return None, f"文件夹 {folder_type} 中没有原图"
        
        return png_files, f"找到 {len(png_files)} 张原图"
        
    except Exception as e:
        return None, f"错误: {str(e)}"

# Gradio 界面
with gr.Blocks(title="Gemini 图片生成") as demo:
    gr.Markdown("# Gemini 图片生成工具")
    
    with gr.Tab("生成图片"):
        with gr.Row():
            with gr.Column():
                prompt_input = gr.Textbox(label="Prompt", lines=3, placeholder="输入图片生成提示词...")
                type_input = gr.Textbox(label="子文件夹名称", placeholder="例如: portraits, landscapes")
                size_input = gr.Dropdown(choices=["2K", "4K"], value="2K", label="图片尺寸")
                file_input = gr.File(label="上传参考图片（可选，最多5张）", file_count="multiple")
                generate_btn = gr.Button("生成图片", variant="primary")
            
            with gr.Column():
                preview_output = gr.Image(label="生成预览（压缩版）", type="filepath")
                status_output = gr.Textbox(label="状态", lines=2)
        
        generate_btn.click(
            fn=generate_image,
            inputs=[prompt_input, type_input, size_input, file_input],
            outputs=[preview_output, status_output]
        )
    
    with gr.Tab("相册预览"):
        with gr.Row():
            with gr.Column(scale=1):
                gallery_type_input = gr.Textbox(label="子文件夹名称", placeholder="例如: portraits")
                load_gallery_btn = gr.Button("加载相册", variant="primary")
                gallery_status = gr.Textbox(label="状态", lines=2)
                download_originals_btn = gr.Button("下载所有原图", variant="secondary")
                download_output = gr.File(label="原图下载", file_count="multiple")
            
            with gr.Column(scale=3):
                gallery_output = gr.Gallery(label="图片相册（压缩预览）", columns=4, height="auto")
        
        load_gallery_btn.click(
            fn=load_gallery,
            inputs=[gallery_type_input],
            outputs=[gallery_output, gallery_status]
        )
        
        download_originals_btn.click(
            fn=get_original_files,
            inputs=[gallery_type_input],
            outputs=[download_output, gallery_status]
        )

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=8299)
    