from PyInstaller.utils.hooks import collect_all

# Collect package code, data (including .dist-info) and hidden imports
datas, binaries, hiddenimports = collect_all('imageio')
