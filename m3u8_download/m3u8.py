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
    
# 将解密后的文件名写入 concat list 文件
def write_concat_list_entry(decrypted_file_path, concat_list_filen_path):
    with open(concat_list_filen_path, "a") as concat_file:
        concat_file.write(f"file '{decrypted_file_path}'\n")
            
# 读取已存在的 concat list 文件，获取已下载和解密的文件名
def read_concat_list(concat_list_filen_path):
    if os.path.exists(concat_list_filen_path):
        with open(concat_list_filen_path, "r") as concat_file:
            return [line.strip().split("file '")[1].rstrip("'") for line in concat_file.readlines()]
    return []

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
encrypted_files_path = []
# 解密后的 TS 文件集合
decrypted_files_path = []
# m3u8 文件名前缀
m3u8_filename_title = m3u8_filename.replace(".m3u8", "")
# 合并列表文件名
concat_list_filename = f"{m3u8_filename_title}_concat_list.txt"
concat_list_filen_path = os.path.join(download_path, concat_list_filename)

# 读取已存在的文件列表
existing_files = set(read_concat_list(concat_list_filen_path))

for i, ts_url in enumerate(ts_urls):
    ts_filename = f"{m3u8_filename_title}_{i}.ts"
    decrypted_filename = f"{m3u8_filename_title}_{i}_out.ts"
    
    ts_file_path = os.path.join(download_path, ts_filename)
    decrypted_file_path = os.path.join(download_path, decrypted_filename)
    
    # 该条 ts 文件已存在，跳过下载和解密
    # 检查 decrypted_file_path 是否是 existing_files 中某个项的一部分
    if any(decrypted_file_path in file for file in existing_files):
        download_bar.update(1)
        continue
    
    # 下载 TS 文件
    ts_response = requests.get(ts_url)
    # 检查响应状态码
    ts_response.raise_for_status()
    with open(ts_file_path, "wb") as ts_file:
        ts_file.write(ts_response.content)
        
    # 验证文件是否成功写入
    if os.path.exists(ts_file_path):
        if os.path.getsize(ts_file_path) < 1:
            print("文件写入失败, 文件大小为0字节")
    else:
        print("文件写入失败, 文件不存在")
    
    # 将 TS 文件添加到待解密集合中
    encrypted_files_path.append(ts_file_path)

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
    else:
        # ts 文件解密完成后删除待解密文件
        os.remove(ts_file_path)

    # 更新进度条
    download_bar.update(1)
    # 将解密成功的TS 文件路径添加到解密后集合中
    decrypted_files_path.append(decrypted_file_path)
    # 将解密后的TS文件路径写入合并列表文件
    write_concat_list_entry(os.path.join('../', decrypted_file_path), concat_list_filen_path)
    # write_concat_list_entry(decrypted_file_path, concat_list_filen_path)

print("下载并解密完成！")
print("合并中...")

# 使用 ffmpeg 合并 TS 文件为 MP4
output_filename = f"{m3u8_filename_title}.mp4"
output_file_path = os.path.join(download_path, output_filename)
ffmpeg_cmd = [
    "ffmpeg", "-f", "concat", "-safe", "0", "-i", concat_list_filen_path, "-c", "copy", output_file_path
]

# 执行 ffmpeg 命令
result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)

if result.returncode != 0:
    print(f"Error: FFmpeg concatenation failed")
    print(result.stderr)
    print(" ".join(ffmpeg_cmd))
    print("合并失败，未清理临时文件，请手动合并！")
else:
    print(f"合并完成，输出文件：{output_filename}")
    print("清理临时文件...")
    
    # 删除临时文件
    for filePath in existing_files:
        print(f"删除文件：{os.path.join(os.path.abspath(os.path.dirname(__file__)), filePath.replace('../', ''))}")
        os.remove(os.path.join(os.path.abspath(os.path.dirname(__file__)), filePath.replace('../', '')))
    
    # os.remove(concat_list_filen_path)
    print("清理完成! 圆满完成所有步骤！！！")