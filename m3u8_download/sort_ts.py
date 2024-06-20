import os
import re

def get_sorted_ts_files(directory):
    # 获取目录下所有 .ts 文件
    ts_files = [f for f in os.listdir(directory) if f.endswith('.ts')]

    # 使用正则表达式提取文件名中的特定数字部分
    def extract_number(filename):
        match = re.search(r'_(\d+)_out\.ts$', filename)
        return int(match.group(1)) if match else 0

    # 按照提取的数字排序
    ts_files.sort(key=extract_number)
    return ts_files

def write_concat_file(ts_files, concat_file_path):
    with open(concat_file_path, 'w') as concat_file:
        for ts_file in ts_files:
            concat_file.write(f"file '{ts_file}'\n")

# 设置目录路径和合并列表文件路径
directory = "/Users/mutong/Documents/tools/chrome_plug_in/BlobDownload/haijiao_m3u8_download/download"
concat_file_path = os.path.join(directory, "concat.txt")

# 获取排序后的 .ts 文件列表
ts_files = get_sorted_ts_files(directory)

# 写入 concat.txt 文件
write_concat_file(ts_files, concat_file_path)

print(f"Concat file written to {concat_file_path}")
