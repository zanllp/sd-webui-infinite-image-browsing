# WIP
# stable-diffusion-webui-baidu-netdisk
stable-diffusion-webui百度云拓展。适用于远程云gpu,colab,jupyterlab等需要保存的场合，实现通过 Vue+FastApi
## 特性
1. 使用拖拽在本地与云之间上传下载文件
1. 支持多任务同时上传/下载，单任务内允许多文件(夹)
2. 支持从历史记录中创建新的任务
3. 关闭页面后任务不停，重新打开后恢复进度显示 (这个很重要，sd-webui一刷新页面进度全没了)
4. 在浏览器前端保存已完成记录，后端保存进行中的任务，对于非跨域链接，历史记录共享
5. 自动从stable-diffusion-webui中获取配置，可以直接快速的文件夹输入
6. 发送和接受路径均支持使用时间日期占位符
7. 使用bduss登录，参考 https://blog.csdn.net/ykiwmy/article/details/103730962 ，或者自己搜索
8. 支持取消/恢复任务



# 预览
简单任务使用拖拽在本地与云之间上传下载文件
<img width="1512" alt="iShot2023-03-19 04 52 54" src="https://user-images.githubusercontent.com/25872019/226139191-00438b3f-9c23-451d-9e15-fbc3a0b715df.png">

复杂任务可以使用创建任务表单
<img width="1887" alt="image" src="https://user-images.githubusercontent.com/25872019/224553431-0bb3f9f2-f81a-452d-a024-4b1030ccdca1.png">

<img width="1315" alt="image" src="https://user-images.githubusercontent.com/25872019/224553787-82c4964d-870e-4674-ae93-4ea7e62068ee.png">


![image](https://user-images.githubusercontent.com/25872019/224564296-c6d5b0ec-f852-42fd-8bb3-4cac57560995.png)
