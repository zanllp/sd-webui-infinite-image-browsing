import launch
import os
import pkg_resources

req_file = os.path.join(os.path.dirname(os.path.realpath(__file__)), "requirements.txt")

def dist2package(dist: str):
    return ({
        "pyfunctional": "functional",
        "python-dotenv": "dotenv",
        "Pillow": "PIL"
    }).get(dist, dist)

# copy from controlnet, thanks
with open(req_file) as file:
    for package in file:
        try:
            package = package.strip()
            if '==' in package:
                package_name, package_version = package.split('==')
                installed_version = pkg_resources.get_distribution(package_name).version
                if installed_version != package_version:
                    launch.run_pip(f"install {package}", f"sd-webui-infinite-image-browsing requirement: changing {package_name} version from {installed_version} to {package_version}")
            elif not launch.is_installed(dist2package(package)):
                launch.run_pip(f"install {package}", f"sd-webui-infinite-image-browsing requirement: {package}")
        except Exception as e:
            print(e)
            print(f'Warning: Failed to install {package}, something may not work.')
