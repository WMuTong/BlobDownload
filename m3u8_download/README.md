## python 脚本

### 使用
```
<!-- 启动虚拟环境 -->
source bin/activate

<!--- 退出虚拟环境 -->
deactivate

<!--- 卸载包 -->
pip uninstall <package_name>

<!--- 安装包 -->
pip install <package_name>

<!--- 运行 -->
python m3u8.py
```

### 说明
```
1、支持根据下载中断再次运行时，从断点位置继续下载（根据 concat.txt 中记录实现）
```

### 其他
`sort_ts.py` 
+ 手动将download文件夹下的ts文件根据名称中的数字进行排序后创建 concat.txt 文件