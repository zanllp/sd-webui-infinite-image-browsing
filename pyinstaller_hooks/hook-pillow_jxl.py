from PyInstaller.utils.hooks import collect_all

# Collect package code, data and hidden imports for pillow-jxl plugin
datas, binaries, hiddenimports = collect_all('pillow_jxl')
