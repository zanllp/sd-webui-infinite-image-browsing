## [中文文档](./README-zh.md)
#  Stable Diffusion webui Infinite Image Browsing

[View recent updates](https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/131)

## Key Features

### Excellent Performance
- Once caching is generated, images can be displayed in just a few milliseconds.
- Images are displayed by default using thumbnails with a default size of 256 pixels. You can adjust the size of the thumbnails in the global settings page.

### 'Walk' Mode
- Automatically load the next folder `(similar to os.walk)`, allowing you to browse all images without paging.
- Tested to work properly with over 27,000 files.

### Image Search & Favorite
- The prompt, model, Lora, and other information will be converted into tags and sorted by frequency of use for precise searching.
- Tags will be listed based on their frequency of use.
- Supports tag autocomplete, translation, and customization.
- Image favorite can be achieved by toggling custom tags for images in the right-click menu.
- Support for advanced search similar to Google
- Also supports fuzzy search, you can search by a part of the filename or generated information.
- Support adding custom search paths for easy management of folders created by the user.

### View Image & `Send To`
- Supports viewing image generation information. Also supported in full-screen preview mode.
- Supports sending images to other tabs.
- Supports full-screen preview.
- Support navigating to the previous or next image in full-screen preview mode by pressing arrow keys or clicking buttons.

### Standalone Operation
- Supports standalone operation without sd-webui.
- Almost all functions can be used normally.
- [Click here for details](https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/47).

### Preview based on File Tree Structure & File operations
- Supports preview based on the file tree structure.
- Supports basic file operations as well as multi-select deletion/moving.
- Press and hold Ctrl, Shift, or Cmd to select multiple items.
- Supports sending files directly to other folders via context menu.
- Support for automatic refresh

If you like this project and find it helpful, please consider giving it a ⭐️. This would be very important for me to continue developing and maintaining this project. If you have any suggestions or ideas, please feel free to raise them in the issue section, and I will respond as soon as possible. Thank you again for your support!

It is strongly recommended to use "Open in new tab" (in the upper right corner of the plugin startup page), which is much more comfortable than being embedded in Gradio.


## Preview

<img width="1920" alt="image" src="https://user-images.githubusercontent.com/25872019/232167682-67f83b00-4391-4394-a7f6-6e4c9d11f252.png">

## Image Search

During the first use, you need to click and wait for the index generation. For my case with 20,000 images, it took about 15 seconds (with an AMD 5600X CPU and PCIe SSD). For subsequent uses, it will check whether there are changes in the folder, and if so, it needs to regenerate the index. Usually, this process is very fast.

Image search supports translation, and you need to place a "tags-translate.csv" file in the plugin folder. You can find this file in the issue . Feel free to share files for other languages to facilitate everyone's use.
<img width="1109" alt="image" src="https://github.com/zanllp/sd-webui-infinite-image-browsing/assets/25872019/62d1ffe3-2d1f-4449-803a-970273753855">
<img width="620" alt="image" src="https://user-images.githubusercontent.com/25872019/234639759-2d270fe5-b24b-4542-b75a-a025ba78ec89.png">

## Full Screen Preview

<img width="1024" alt="image" src="https://user-images.githubusercontent.com/25872019/232167416-32a8b19d-b766-4f98-88f6-a1d48eaebec0.png">

In full-screen preview mode, you can also view image information and perform operations on the context menu. It supports dragging, resizing and expanding/collapsing .

https://user-images.githubusercontent.com/25872019/235327735-bfb50ea7-7682-4e50-b303-38159456e527.mp4

### Right-click menu
<img width="536" alt="image" src="https://user-images.githubusercontent.com/25872019/232162244-e728d510-b6c6-45e6-afb3-872bd67db05b.png">

### Walk mode


https://user-images.githubusercontent.com/25872019/230768207-daab786b-d4ab-489f-ba6a-e9656bd530b8.mp4




### Dark mode

<img width="768" alt="image" src="https://user-images.githubusercontent.com/25872019/230064879-c95866ac-999d-4d4b-87ea-3e38c8479415.png">
