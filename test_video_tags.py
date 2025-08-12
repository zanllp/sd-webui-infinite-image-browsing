#!/usr/bin/env python3
"""
测试脚本：验证视频文件标签解析功能
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scripts.iib.db.update_image_data import get_exif_data

def test_video_tag_parsing():
    """测试视频标签解析功能"""
    test_videos = [
        r"C:\Users\jack\Documents\sd-webui-infinite-image-browsing\测试视频\2023-02-12 17.15.14-视频-fans-看你挺会走路的 要不要一起去散步#巨蟹座.mp4",
        r"C:\Users\jack\Documents\sd-webui-infinite-image-browsing\测试视频\2024-11-15 20.11.19-视频-榨菜肉丝-做一道菜 #甜妹 #厨娘上线 #厦门同城 #白羊女#.mp4"
    ]
    
    for test_video in test_videos:
        print(f"\n测试文件: {os.path.basename(test_video)}")
        print(f"文件存在: {os.path.exists(test_video)}")
        
        # 测试标签解析
        result = get_exif_data(test_video)
        
        print(f"解析结果:")
        print(f"- raw_info: {result.raw_info}")
        if result.params:
            print(f"- pos_prompt 数量: {len(result.params.pos_prompt)}")
            print(f"- pos_prompt: {result.params.pos_prompt[:5]}...") # 只显示前5个标签
            print(f"- meta: {result.params.meta}")
        else:
            print("- params: None")

if __name__ == "__main__":
    test_video_tag_parsing()