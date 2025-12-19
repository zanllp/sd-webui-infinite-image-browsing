from PyInstaller.utils.hooks import collect_all

# Collect package code, data and hidden imports for PyAV
datas, binaries, hiddenimports = collect_all('av')
