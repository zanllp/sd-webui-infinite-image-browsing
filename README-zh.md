

# Stable-Diffusion-WebUI无边图像浏览


[查看近期更新](https://github.com/zanllp/sd-webui-infinite-image-browsing/wiki/Change-log)

<p style="text-align:center;margin:0 32px">不仅仅是图像浏览器，更是一个强大的图像管理器。精确的图像搜索配合多选操作进行筛选/归档/打包，成倍提高效率。更是支持以独立模式运行，无需SD-Webui</p>



https://github.com/zanllp/sd-webui-infinite-image-browsing/assets/25872019/807b890b-7be8-4816-abba-f3ad340a2232


## 主要特性

### 🔥 极佳性能
- 存在缓存的情况下后，图像可以在几毫秒内显示。
- 默认使用缩略图显示图像，默认大小为512像素，您可以在全局设置页中调整缩略图分辨率。
- 你还可以控制网格图像的宽度，允许以64px到1024px的宽度范围进行显示

### 🔍 图像搜索和收藏
- 将会把Prompt、Model、Lora等信息转成标签，将根据使用频率排序以供进行精确的搜索。
- 支持标签自动完成、[翻译](https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/39)和自定义。
- 可通过在右键菜单切换自定义标签来实现图像收藏。
- 支持类似谷歌的高级搜索。
- 同样支持模糊搜索，您可以使用文件名或生成信息的一部分进行搜索。
- 支持添加自定义搜索路径，方便管理自己创建的文件夹集合。

### 🖼️ 查看图像/视频和“发送到”
- 支持查看图像生成信息。全屏预览下同样支持。
- 支持将图像发送到其他选项卡和其他插件，例如 ControlNet, openOutpaint。
- 支持全屏预览，并且支持在全屏预览下使用自定义快捷键进行操作
- 支持在全屏预览模式下通过按下方向键或点击按钮移动到前一个或后一个图像。
- 支持播放远程服务器上的视频文件

### 💻 多种使用方法
- 您可以将其作为 SD-webui 的扩展安装。
- 您可以使用 Python 独立运行它。
- 还提供桌面应用程序版本。

### 🚶‍♀️ Walk模式
- 自动加载下一个文件夹 `(类似于 os.walk)`，可让您无需分页浏览所有图像。
- 已测试可正常处理超过 27,000 个文件。

### 🌳 基于文件树结构的预览和文件操作
- 支持基于文件树结构的预览。
- 支持自动刷新。
- 支持基本文件操作以及多选删除/移动/复制，新建文件夹等。
- 按住 Ctrl、Shift 或 Cmd 键可选择多个项目。

### 🆚 图像对比 (类似ImgSli)
- 提供两张图片的并排比较

### 🌐 多语言支持
- 目前支持简体中文/繁体中文/英文/德语。
- 如果您希望添加新的语言，请参考 [i18n.ts](https://github.com/zanllp/sd-webui-infinite-image-browsing/blob/main/vue/src/i18n/zh-hans.ts) 并提交相关的代码。


### 🔐 隐私和安全
- 支持自定义secret key来进行身份验证
- 支持配置对文件系统的访问控制，默认将在服务允许公开访问时启用
- 支持自定义访问控制允许的路径。
- 支持控制访问权限。你可以让IIB以只读模式运行
- [点击这里查看详情](.env.example)

### ⌨️ 快捷键
- 支持删除和添加/移除Tag，在全局设置页进行自定义触发按钮

### 📦 打包 / 批量下载
- 允许你一次性打包下载多个图像
- 数据来源可以是搜索结果/普通的图像网格查看页面/walk模式等。使用拖拽或者“发送到”都可将图片添加待处理列表


如果您喜欢这个项目并且觉得它对您有帮助，请考虑给我点个⭐️。这将对我持续开发和维护这个项目非常重要。如果您有任何建议或者想法，请随时在issue中提出，我会尽快回复。再次感谢您的支持！


<a href='https://ko-fi.com/zanllp' target='_blank'><img height='35' style='border:0px;height:46px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />


[视频演示可以在Bilibili上观看](https://space.bilibili.com/27227392/channel/series)
# 安装/运行

## 作为SD-webui的扩展程序:
1. 在SD-webui中打开`扩展`选项卡。
2. 选择`从URL安装`选项。
3. 输入 `https://github.com/zanllp/sd-webui-infinite-image-browsing`。
4. 点击`安装`按钮。
5. 等待安装完成，然后点击`应用并重启UI`。

## 作为使用Python运行的独立程序（不需要SD-webui）:
请参考[Can the extension function without the web UI?](https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/47)

如果需要查看ComfyUI/Fooocus生成的图片相关，请先参考 https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/202#issuecomment-1655764627

如果你需要dockerfile 参考  https://github.com/zanllp/sd-webui-infinite-image-browsing/discussions/366

## 作为桌面应用程序（不需要SD-webui和Python）:
exe版本同样支持ComfyUI/Fooocus

从仓库页面右侧的`releases`部分下载并安装程序。如果提示检测到病毒忽略即可这是误报。

如果你需要自行编译请参考 https://github.com/zanllp/sd-webui-infinite-image-browsing/blob/main/.github/workflows/tauri_app_build.yml
## 作为库使用

使用iframe接入IIB，将IIB作为你应用的文件浏览器使用。 参考 https://github.com/zanllp/sd-webui-infinite-image-browsing/blob/main/vue/usage.md

# 预览

<img width="1920" alt="image" src="https://user-images.githubusercontent.com/25872019/230064374-47ba209e-562b-47b8-a2ce-d867e3afe204.png">

## 图像搜索

在第一次使用时，你需要点击等待索引的生成，我2万张图像的情况下大概需要15秒（配置是amd 5600x和pcie ssd）。后续使用他会检查文件夹是否发生变化，如果发生变化则需要重新生成索引,通常这个过程极快。

图像搜索支持翻译，具体看这个 https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/39 。
<img width="1109" alt="image" src="https://github.com/zanllp/sd-webui-infinite-image-browsing/assets/25872019/62d1ffe3-2d1f-4449-803a-970273753855">
<img width="620" alt="image" src="https://user-images.githubusercontent.com/25872019/234639759-2d270fe5-b24b-4542-b75a-a025ba78ec89.png">
## 图像比较

![ezgif com-video-to-gif](https://github.com/zanllp/sd-webui-infinite-image-browsing/assets/25872019/4023317b-0b2d-41a3-8155-c4862eb43846)

## 全屏预览
<img width="1024" alt="image" src="https://user-images.githubusercontent.com/25872019/232167416-32a8b19d-b766-4f98-88f6-a1d48eaebec0.png">

在全屏预览下同样可以查看图片信息和进行上下文菜单上的的操作，支持拖拽/调整/展开收起

https://user-images.githubusercontent.com/25872019/235327735-bfb50ea7-7682-4e50-b303-38159456e527.mp4


如果你和我一样不需要查看生成信息，你可以选择直接缩小这个面板，所有上下文操作仍然可用

<img width="599" alt="image" src="https://github.com/zanllp/sd-webui-infinite-image-browsing/assets/25872019/f26abe8c-7a76-45c3-9d7f-18ae8b6b6a91">

### 右键菜单
<img width="1024" alt="image" src="https://user-images.githubusercontent.com/25872019/230896820-26344b09-2297-4a2f-a6a7-4c2f0edb8a2c.png">

也可以通过右上角的图标来触发
<img width="227" alt="image" src="https://github.com/zanllp/sd-webui-infinite-image-browsing/assets/25872019/f2005ad3-2d3b-4fa7-b3e5-bc17f26f7e19">

### Walk模式


https://user-images.githubusercontent.com/25872019/230768207-daab786b-d4ab-489f-ba6a-e9656bd530b8.mp4




### 深色模式

<img width="768" alt="image" src="https://user-images.githubusercontent.com/25872019/230064879-c95866ac-999d-4d4b-87ea-3e38c8479415.png">


