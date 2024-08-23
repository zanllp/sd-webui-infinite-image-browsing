import os
import importlib.util
import sys
from scripts.iib.tool import cwd

def load_plugins(plugin_dir):
    if not os.path.exists(plugin_dir):
        return []
    plugins = []
    for filename in os.listdir(plugin_dir):
        main_module_path = os.path.join(plugin_dir, filename, 'main.py')
        if not os.path.exists(main_module_path):
            continue
        spec = importlib.util.spec_from_file_location('main', main_module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        plugins.append(module)
    return plugins

plugin_insts = []
plugin_inst_map = {}
# 使用插件
try:
    plugin_dir = os.path.normpath(os.path.join(cwd, 'plugins'))
    plugins = load_plugins(plugin_dir)
    sys.path.append(plugin_dir)
    for plugin in plugins:
        try:
            res = plugin.Main()
            plugin_insts.append(res)
            plugin_inst_map[res.source_identifier] = res
            print(f'IIB loaded plugin: {res.name}')
        except Exception as e:
            print(f'Error running plugin {plugin.__class__.__name__}: {e}')
except Exception as e:
    print(f'Error loading plugins: {e}')