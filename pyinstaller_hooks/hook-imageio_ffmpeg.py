from PyInstaller.utils.hooks import collect_all

# Collect package code, data and hidden imports for imageio-ffmpeg
datas, binaries, hiddenimports = collect_all('imageio_ffmpeg')
