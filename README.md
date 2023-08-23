[中文文档](./README-zh.md)

[View recent updates (Change log)](https://github.com/zanllp/sd-webui-infinite-image-browsing/wiki/Change-log)

#  Stable Diffusion webui Infinite Image Browsing

<p style="text-align:center;margin:0 32px;">It's not just an image browser, but also a powerful image manager. Precise image search combined with multi-selection operations allows for filtering/archiving/packaging, greatly increasing efficiency. It also supports running in standalone mode, without the need for SD-Webui.</p>

https://github.com/zanllp/sd-webui-infinite-image-browsing/assets/25872019/807b890b-7be8-4816-abba-f3ad340a2232
## Key Features

### 🔥 Excellent Performance
- Once caching is generated, images can be displayed in just a few milliseconds.
- Images are displayed with thumbnails by default, with a default size of 512 pixels. You can adjust the thumbnail resolution on the global settings page.
- You can also control the width of the grid images, allowing them to be displayed in widths ranging from 64px to 1024px.

### 🔍 Image Search & Favorite
- The prompt, model, Lora, and other information will be converted into tags and sorted by frequency of use for precise searching.
- Supports tag autocomplete, [auto-translation](https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/39), and customization.
- Image favorite can be achieved by toggling custom tags for images in the right-click menu.
- Support for advanced search similar to Google
- Also supports fuzzy search, you can search by a part of the filename or generated information.
- Support adding custom search paths for easy management of folders created by the user.

### 🖼️ View Image & `Send To`
- Supports viewing image generation information. Also supported in full-screen preview mode.
- Supports sending images to other tabs and third-party extensions such as ControlNet , openOutpaint.
- Support full-screen preview and enable custom shortcut key operations while in full-screen preview mode.
- Support navigating to the previous or next image in full-screen preview mode by pressing arrow keys or clicking buttons.


### 💻 Multiple Usage Methods
- You can install it as an extension on SD-webui. 
- You can run it independently using Python.
- The desktop app version is also available.


### 🚶‍♀️ Walk Mode
- Automatically load the next folder `(similar to os.walk)`, allowing you to browse all images without paging.
- Tested to work properly with over 27,000 files.

### 🌳 Preview based on File Tree Structure & File operations
- Supports file tree-based preview.
- Supports automatic refreshing.
- Supports basic file operations, such as multiple selection for deleting/moving/copying, and creating new folders.
- Hold down the Ctrl, Shift, or Cmd key to select multiple items.

### 🆚 image comparison (similar to Imgsli)
- Provides a side-by-side comparison of two images.

### 🌐 Multilingual Support
- Currently supports Simplified Chinese/English/German.
- If you would like to add a new language, please refer to [i18n.ts](https://github.com/zanllp/sd-webui-infinite-image-browsing/blob/main/vue/src/i18n.ts) and submit the relevant code.

### 🔐 Privacy and Security
- Supports custom secret key for authentication.
- Supports configuring access control for the file system, which will be enabled by default when the service allows public access.
- Supports customizing the allowed paths for access control.
- Supports controlling access permissions. You can run IIB in read-only mode.
- [Click here to see details](.env.example)


### 📦 Packaging/Batch Download
- Allows you to download multiple images at once.
- The data source can be search results, a regular image grid view page, walk mode, etc. Images can be added to the processing list through drag-and-drop or "Send To".
### ⌨️ Keyboard Shortcuts
- Allows for deleting and adding/removing tags, with customizable trigger buttons in the global settings page.


If you like this project and find it helpful, please consider giving it a ⭐️. This would be very important for me to continue developing and maintaining this project. If you have any suggestions or ideas, please feel free to raise them in the issue section, and I will respond as soon as possible. Thank you again for your support!


<a href='https://ko-fi.com/zanllp' target='_blank'><img height='35' style='border:0px;height:46px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />



# Installation / Running
## As an extension for SD-webui:
1. Open the `Extensions` tab in SD-webui.
2. Select the `Install from URL` option.
3. Enter `https://github.com/zanllp/sd-webui-infinite-image-browsing`.
4. Click on the `Install` button.
5. Wait for the installation to complete and click on `Apply and restart UI`.

## As a standalone program that runs using Python. (without SD-webui):

Refer to [Can the extension function without the web UI?](https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/47)

If you need to view images generated by ComfyUI, please refer to https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/202.

If you need a Dockerfile, you can refer to this link.  https://github.com/zanllp/sd-webui-infinite-image-browsing/discussions/366

## As a desktop application (without SD-webui and Python):
Download and install the program from the `releases` section on the right-hand side of the repository page.
# Preview

<img width="1920" alt="image" src="https://user-images.githubusercontent.com/25872019/232167682-67f83b00-4391-4394-a7f6-6e4c9d11f252.png">

## Image Search

During the first use, you need to click and wait for the index generation. For my case with 20,000 images, it took about 15 seconds (with an AMD 5600X CPU and PCIe SSD). For subsequent uses, it will check whether there are changes in the folder, and if so, it needs to regenerate the index. Usually, this process is very fast.

Image search supports translation, see https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/39 for more detail. Feel free to share files for other languages to facilitate everyone's use.
<img width="1109" alt="image" src="https://github.com/zanllp/sd-webui-infinite-image-browsing/assets/25872019/62d1ffe3-2d1f-4449-803a-970273753855">
<img width="620" alt="image" src="https://user-images.githubusercontent.com/25872019/234639759-2d270fe5-b24b-4542-b75a-a025ba78ec89.png">

## Full Screen Preview

<img width="1024" alt="image" src="https://user-images.githubusercontent.com/25872019/232167416-32a8b19d-b766-4f98-88f6-a1d48eaebec0.png">

In full-screen preview mode, you can also view image information and perform operations on the context menu. It supports dragging, resizing and expanding/collapsing .

https://user-images.githubusercontent.com/25872019/235327735-bfb50ea7-7682-4e50-b303-38159456e527.mp4

If you, like me, don't need to view the generation information, you can choose to simply minimize this panel, and all contextual operations will still be available.

<img width="599" alt="image" src="https://github.com/zanllp/sd-webui-infinite-image-browsing/assets/25872019/f26abe8c-7a76-45c3-9d7f-18ae8b6b6a91">

## Image comparison

![ezgif com-video-to-gif](https://github.com/zanllp/sd-webui-infinite-image-browsing/assets/25872019/4023317b-0b2d-41a3-8155-c4862eb43846)

### Right-click menu
<img width="536" alt="image" src="https://user-images.githubusercontent.com/25872019/232162244-e728d510-b6c6-45e6-afb3-872bd67db05b.png">

You can also trigger it by hovering your mouse over the icon in the top right corner.

<img width="227" alt="image" src="https://github.com/zanllp/sd-webui-infinite-image-browsing/assets/25872019/f2005ad3-2d3b-4fa7-b3e5-bc17f26f7e19">

### Walk mode


https://user-images.githubusercontent.com/25872019/230768207-daab786b-d4ab-489f-ba6a-e9656bd530b8.mp4




### Dark mode

<img width="768" alt="image" src="https://user-images.githubusercontent.com/25872019/230064879-c95866ac-999d-4d4b-87ea-3e38c8479415.png">
