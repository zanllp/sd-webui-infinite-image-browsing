import launch
import os

req_file = os.path.join(os.path.dirname(os.path.realpath(__file__)), "requirements.txt")

def dist2package(dist: str):
    return ({
        "python-dotenv": "dotenv",
        "Pillow": "PIL",
        "pillow-avif-plugin": "pillow_avif"
    }).get(dist, dist)

def extract_package_name(package_spec: str) -> str:
    """Extract package name from package specification.
    Handles formats like: package, package==1.0, package>=1.0, package>=1.0,<2.0
    """
    # Remove git URL suffix if present
    package_spec = package_spec.split("@git")[0].strip()
    # Extract package name (everything before version specifiers)
    for sep in ["==", ">=", "<=", ">", "<", "~=", "!="]:
        if sep in package_spec:
            package_spec = package_spec.split(sep)[0].strip()
            break
    # Handle version ranges - extract package name before first comma
    if "," in package_spec:
        package_spec = package_spec.split(",")[0].strip()
    return package_spec



with open(req_file) as file:
    for package in file:
        try:
            package = package.strip()
            package_name = extract_package_name(package)
            if not launch.is_installed(dist2package(package_name)):
                launch.run_pip(f"install \"{package}\"", f"sd-webui-infinite-image-browsing requirement: {package}")
        except Exception as e:
            # Handle Unicode encoding errors on Windows
            try:
                print(str(e))
            except UnicodeEncodeError:
                print(repr(e))
            print(
                f"Warning: Failed to install {package}, some preprocessors may not work."
            )
