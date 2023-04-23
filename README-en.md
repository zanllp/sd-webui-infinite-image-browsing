# sd-webui-infinite-image-browsing


A high-performance image (file) browser 😋.It is suitable for use in all places, and has been optimized for cloud computing, You can use thumbnails to quickly preview, so fast that you almost don't feel the loading time.

If you have any questions or suggestions about this project, please submit an issue on GitHub (Both Chinese and English are acceptable), or check the FAQ section at the bottom first.

## Key Features
- Multi-tab and multi-pane like Chrome and VS Code. Create tabs and preview multiple folders, move files between panes.
- Supports using 'walk' mode to browse images, automatically loading the next folder `(similar to os.walk)`, allowing you to browse all images without paging. Tested to work properly with over 27,000 files.
- It supports searching images using prompt, model, lora, etc. The used tags will be listed. Supports auto completion and translation of tags. Moreover, image search can be completed instantly.
- View image generation information, send images to other tabs, optional thumbnail preview, full-screen preview, and move.
- Preview based on the file tree structure, supports basic file operations as well as multi-select deletion/moving.


It is strongly recommended to use "Open in new tab" (in the upper right corner of the plugin startup page), which is much more comfortable than being embedded in Gradio. However, the "send image to other tab" function cannot be used in this mode.


## Preview

<img width="1920" alt="image" src="https://user-images.githubusercontent.com/25872019/232167682-67f83b00-4391-4394-a7f6-6e4c9d11f252.png">

## Image Search

During the first use, you need to click and wait for the index generation. For my case with 20,000 images, it took about 15 seconds (with an AMD 5600X CPU and PCIe SSD). For subsequent uses, it will check whether there are changes in the folder, and if so, it needs to regenerate the index. Usually, this process is very fast.

Image search supports translation, and you need to place a "tags-translate.csv" file in the plugin folder. You can find this file in the issue . Feel free to share files for other languages to facilitate everyone's use.

<img width="1024" alt="image" src="https://user-images.githubusercontent.com/25872019/233799746-1fad5cbd-7172-4fb5-898c-cd59e739e1f7.png">

## Full Screen Preview

<img width="1024" alt="image" src="https://user-images.githubusercontent.com/25872019/232167416-32a8b19d-b766-4f98-88f6-a1d48eaebec0.png">

### Right-click menu
<img width="536" alt="image" src="https://user-images.githubusercontent.com/25872019/232162244-e728d510-b6c6-45e6-afb3-872bd67db05b.png">

### Walk mode


https://user-images.githubusercontent.com/25872019/230768207-daab786b-d4ab-489f-ba6a-e9656bd530b8.mp4




### Dark mode

<img width="768" alt="image" src="https://user-images.githubusercontent.com/25872019/230064879-c95866ac-999d-4d4b-87ea-3e38c8479415.png">

## FAQ

### How to open the right-click menu on mobile devices?

You need to enable "Support long press to open right-click menu" in the global settings first, and then use long press to perform the operation instead of right-clicking to open the right-click menu.

<img width="512" alt="image" src="https://user-images.githubusercontent.com/25872019/232276303-c175e78a-d127-4afd-9281-85080bf75c5a.jpg">


## How can I control the sorting/display mode/copy the current page path/move to a specific folder?
You can choose the sorting method in the upper-right corner of the TabPane

More 

<img width="445" alt="image" src="https://user-images.githubusercontent.com/25872019/233480083-7c121ce0-4c79-4786-befb-d388398e565f.png">

## How to reduce mental burden when opening a large number of sub-folders within a large folder for viewing?

Recommend using the right-click menu of the folder, click 'Open in new tab' or 'Open on the right'.

<img width="878" alt="image" src="https://user-images.githubusercontent.com/25872019/233801373-8d21f237-b6e4-4b0a-81d0-fee2b8e370f4.png">


### Does it need to run independently of stable-diffusion-webui?

Refer to this [baiduyun-web-transfer](https://github.com/zanllp/baiduyun-web-transfer).
