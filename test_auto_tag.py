import unittest
from unittest.mock import MagicMock, patch
import sys
import os

# Add current directory to sys.path
sys.path.append(os.getcwd())

from scripts.iib.auto_tag import AutoTagMatcher
from scripts.iib.parsers.model import ImageGenerationParams

class TestAutoTagMatcher(unittest.TestCase):
    def setUp(self):
        self.mock_conn = MagicMock()
        
    @patch('scripts.iib.auto_tag.GlobalSetting.get_setting')
    def test_match_pos_prompt(self, mock_get_setting):
        # Define rules
        rules = [
            {
                "tag": "Dog",
                "filters": [
                    {"field": "pos_prompt", "operator": "contains", "value": "dog"}
                ]
            }
        ]
        mock_get_setting.return_value = rules
        
        matcher = AutoTagMatcher(self.mock_conn)
        
        # Case 1: Match
        params = ImageGenerationParams(pos_prompt=["a cute dog", "running"])
        self.assertTrue(matcher.match(params, rules[0]))
        
        # Case 2: No Match
        params = ImageGenerationParams(pos_prompt=["a cute cat", "sleeping"])
        self.assertFalse(matcher.match(params, rules[0]))

    @patch('scripts.iib.auto_tag.GlobalSetting.get_setting')
    def test_match_meta(self, mock_get_setting):
        rules = [
            {
                "tag": "SDXL",
                "filters": [
                    {"field": "Model", "operator": "contains", "value": "SDXL"}
                ]
            }
        ]
        mock_get_setting.return_value = rules
        matcher = AutoTagMatcher(self.mock_conn)
        
        params = ImageGenerationParams(meta={"Model": "SDXL 1.0"})
        self.assertTrue(matcher.match(params, rules[0]))
        
        params = ImageGenerationParams(meta={"Model": "SD 1.5"})
        self.assertFalse(matcher.match(params, rules[0]))

    @patch('scripts.iib.auto_tag.GlobalSetting.get_setting')
    @patch('scripts.iib.auto_tag.Tag.get_or_create')
    @patch('scripts.iib.auto_tag.ImageTag')
    def test_apply(self, mock_image_tag, mock_tag_get_or_create, mock_get_setting):
        rules = [
            {
                "tag": "Dog",
                "filters": [
                    {"field": "pos_prompt", "operator": "contains", "value": "dog"}
                ]
            }
        ]
        mock_get_setting.return_value = rules
        
        mock_tag = MagicMock()
        mock_tag.id = 1
        mock_tag_get_or_create.return_value = mock_tag
        
        matcher = AutoTagMatcher(self.mock_conn)
        params = ImageGenerationParams(pos_prompt=["dog"])
        
        matcher.apply(123, params)
        
        mock_tag_get_or_create.assert_called_with(self.mock_conn, "Dog", "custom")
        mock_image_tag.assert_called_with(123, 1)
        mock_image_tag.return_value.save_or_ignore.assert_called_with(self.mock_conn)

if __name__ == '__main__':
    unittest.main()
