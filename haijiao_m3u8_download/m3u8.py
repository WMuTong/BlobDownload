import os
import re
import requests
import subprocess
import tkinter as tk
from tkinter import filedialog 
import chardet
import tqdm

# 检测文件编码
def detect_encoding(file_path):
    with open(file_path, 'rb') as f:
        raw_data = f.read()
        encoding = chardet.detect(raw_data)['encoding']
        return encoding

# 创建 Tikinter 窗口
root = tk.Tk()
# 隐藏窗口
root.withdraw()
download_path = "download"

# 选择 M3U8 文件
m3u8_path = filedialog.askopenfilename(title="选择 M3U8 文件", filetypes=[("M3U8 文件", "*.m3u8")])

if m3u8_path:
    # 获取 M3U8 文件所在目录和文件名
    directory, m3u8_filename = os.path.split(m3u8_path)
    
    # 获取 M3U8 文件的密钥文件名
    key_filename = m3u8_filename.replace(".m3u8", ".key")
    key_path = os.path.join(directory, key_filename)
    
    if os.path.exists(key_path):
        try:
            with open(m3u8_path, 'r', encoding='utf-8') as file:
                m3u8_content = file.read()
        except Exception as e:
            print(f"读取 M3U8 文件时出错：{e}")
        
        try:    
            # 读取本地密钥文件
            with open(key_path, "rb") as key_file:
                key = key_file.read()
        except Exception as e:
            print(f"读取本地密钥文件时出错：{e}")
    else:
        print(f"密钥文件不存在：{key_path}")
else:
    print("未选择 M3U8 文件")

# 确保 m3u8_content 是字符串
if isinstance(m3u8_content, bytes):
    m3u8_content = m3u8_content.decode('utf-8')

# 从 M3U8 文件中提取 IV 和 TS 文件 URL
iv_match = re.search(r'IV=(0x[0-9a-fA-F]+)', m3u8_content)
if iv_match:
    # 提取 IV
    iv = iv_match.group(1)
else:
    raise ValueError("IV not found in m3u8 content")

# 从 M3U8 文件中提取 TS 文件 URL
ts_urls = re.findall(r'(https://.*?\.ts\?.*?)\n', m3u8_content)

# 创建下载进度条
download_bar = tqdm.tqdm(total=len(ts_urls), desc="下载和解密TS文件")

# 待解密的 TS 文件集合
encrypted_files = []
# 解密后的 TS 文件集合
decrypted_files = []
# m3u8 文件名前缀
m3u8_filename_title = m3u8_filename.replace(".m3u8", "")
for i, ts_url in enumerate(ts_urls):
    ts_filename = f"{m3u8_filename_title}_{i}.ts"
    decrypted_filename = f"{m3u8_filename_title}_{i}.ts"
    
    ts_file_path = os.path.join(download_path, ts_filename)
    decrypted_file_path = os.path.join(download_path, decrypted_filename)

    # 更新进度条
    download_bar.update(1)
    
    # 下载 TS 文件
    ts_response = requests.get(ts_url)
    # 检查响应状态码
    ts_response.raise_for_status()
    with open(ts_file_path, "wb") as ts_file:
        ts_file.write(ts_response.content)
    
    # 将 TS 文件添加到待解密集合中
    encrypted_files.append(ts_file_path)

    # 解密 TS 文件
    openssl_cmd = [
        "openssl", "aes-128-cbc",
        "-d",  # 解密模式
        "-in", ts_file_path,
        "-out", decrypted_file_path,
        "-nosalt",
        "-K", key.hex(),
        "-iv", iv[2:]  # Remove '0x' prefix
    ]

    # 使用 OpenSSL 解密
    result = subprocess.run(openssl_cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"Error: OpenSSL decryption failed for {ts_filename}")
        print(result.stderr)
        print(" ".join(openssl_cmd))
        print("解密失败？？?")
        exit(0)
        continue

    decrypted_files.append(decrypted_file_path)

print("解密完成！")
print("合并中...")
# 合并解密后的 TS 文件
concat_list_filename = "concat_list.txt"
concat_list_filen_path = os.path.join(download_path, concat_list_filename)
with open(concat_list_filename, "w") as concat_list_file:
    for decrypted_file in decrypted_files:
        concat_list_file.write(f"file '{decrypted_file}'\n")

# 使用 ffmpeg 合并 TS 文件为 MP4
output_filename = f"{m3u8_filename_title}.mp4"
output_file_path = os.path.join(download_path, output_filename)
ffmpeg_cmd = [
    "ffmpeg", "-f", "concat", "-safe", "0", "-i", concat_list_filen_path, "-c", "copy", output_filename
]

# 执行 ffmpeg 命令
result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)

if result.returncode != 0:
    print(f"Error: FFmpeg concatenation failed")
    print(result.stderr)
else:
    print(f"合并完成，输出文件：{output_filename}")
    
print("清理临时文件...")
# 删除临时文件
for encrypted_filename in encrypted_files:
    os.remove(encrypted_filename)
for decrypted_filename in decrypted_files:
    os.remove(decrypted_filename)
os.remove(concat_list_filen_path)
print("清理完成! 圆满完成所有步骤！！！")