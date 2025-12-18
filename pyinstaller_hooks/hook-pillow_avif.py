from PyInstaller.utils.hooks import collect_all

# Collect package code, data and hidden imports for pillow-avif-plugin
datas, binaries, hiddenimports = collect_all('pillow_avif')
