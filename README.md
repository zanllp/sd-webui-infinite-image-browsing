# [English](./README-en.md)

# Stable-Diffusion-WebUI无边图像浏览

> 百度云部分已独立，如果你有需要请[点此单独安装](https://github.com/zanllp/sd-webui-baidu-netdisk)

## 主要特性

### 极好的性能
- 生成缓存后，图像可以在几毫秒内显示。
- 默认使用缩略图显示图像，还可以调整缩略图的大小

### “walk”模式
- 自动加载下一个文件夹 `(类似于 os.walk)`，可让您无需分页浏览所有图像。
- 已测试可正常处理超过 27,000 个文件。

### 图像搜索 & 收藏
- 支持使用 Prompt、Model、Lora 等进行图像搜索。
- 标签将根据使用频率排序。
- 支持标签自动完成、翻译和自定义。
- 可通过在右键菜单切换自定义标签来实现图像收藏。

### 图像预览 & `发送到`
- 支持查看图像生成信息。
- 支持将图像发送到其他选项卡。
- 支持全屏预览。
- 支持在全屏预览模式下移动图像。

### 独立运行
- 支持无需 sd-webui 单独运行。
- 几乎所有功能都可以正常使用。
- [点击此处获取详情](https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/47)。

### 基于文件树结构的预览和文件操作
- 支持基于文件树结构的预览。
- 支持基本文件操作以及多选删除/移动。
- 按住 Ctrl、Shift 或 Cmd 键可选择多个项目。
- 支持通过右键菜单直接发送文件到其他文件夹。



强烈推荐使用在`在新页面打开`（在插件启动页的右上角），比塞在gradio里舒服太多，不过这时`发送图像到其他tab`功能是用不了的。


[视频演示可以在Bilibili上观看](https://space.bilibili.com/27227392/channel/series)

## 预览

<img width="1920" alt="image" src="https://user-images.githubusercontent.com/25872019/230064374-47ba209e-562b-47b8-a2ce-d867e3afe204.png">

## 图像搜索

在第一次使用时，你需要点击等待索引的生成，我2万张图像的情况下大概需要15秒（配置是amd 5600x和pcie ssd）。后续使用他会检查文件夹是否发生变化，如果发生变化则需要重新生成索引,通常这个过程极快。

图像搜索支持翻译，你需要在插件文件夹下放置一个tags-translate.csv的文件，你可以在issue中找到这个文件。欢迎其他语言的也分享出来，方便大家使用。

<img width="1024" alt="image" src="https://user-images.githubusercontent.com/25872019/234639132-0240dad0-86aa-499b-8e00-20bf2d7f06c3.png">
<img width="620" alt="image" src="https://user-images.githubusercontent.com/25872019/234639759-2d270fe5-b24b-4542-b75a-a025ba78ec89.png">


## 全屏预览
<img width="1024" alt="image" src="https://user-images.githubusercontent.com/25872019/232167416-32a8b19d-b766-4f98-88f6-a1d48eaebec0.png">

在全屏预览下同样可以查看图片信息和进行上下文菜单上的的操作，支持拖拽/调整/展开收起

https://user-images.githubusercontent.com/25872019/235327735-bfb50ea7-7682-4e50-b303-38159456e527.mp4


### 右键菜单
<img width="1024" alt="image" src="https://user-images.githubusercontent.com/25872019/230896820-26344b09-2297-4a2f-a6a7-4c2f0edb8a2c.png">

### Walk模式


https://user-images.githubusercontent.com/25872019/230768207-daab786b-d4ab-489f-ba6a-e9656bd530b8.mp4




### 深色模式

<img width="768" alt="image" src="https://user-images.githubusercontent.com/25872019/230064879-c95866ac-999d-4d4b-87ea-3e38c8479415.png">





## FAQ

### 在移动端如何打开右键菜单？

你必须先在全局设置中把“支持使用长按打开右键菜单”打开，然后使用长按进行操作，即可代替右键打开右键菜单

<img width="512" alt="image" src="https://user-images.githubusercontent.com/25872019/232274767-cc0ec850-343c-416c-aa80-2c85c76a05d8.jpg">

### 如何控制排序/显示模式/复制当前页面路径/移动至指定文件夹?
您可以在 TabPane 的右上角点击更多。

### 需要在一个大文件夹内打开大量的小文件夹进行查看时如何降低心理负担？

推荐使用文件夹的右键菜单，点击在新标签页打开或者在右边打开

<img width="1024" alt="image" src="https://user-images.githubusercontent.com/25872019/233800975-93258edf-5325-436a-b9c8-3574de2edfcb.png">
