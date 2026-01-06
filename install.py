import launch
import os

req_file = os.path.join(os.path.dirname(os.path.realpath(__file__)), "requirements.txt")

# Optional dependencies that can be skipped
OPTIONAL_PACKAGES = {"hnswlib", "numpy"}
SKIP_OPTIONAL = os.environ.get("IIB_SKIP_OPTIONAL_DEPS", "").lower() in ("1", "true", "yes")

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

def get_optional_package_hints(package_name: str) -> str:
    """Provide helpful hints for optional package installation failures."""
    hints = {
        "hnswlib": (
            "\nNote: hnswlib is optional and only needed for experimental topic clustering/search.\n"
            "Core image browsing features will still work without hnswlib in some cases.\n"
            "To skip optional dependencies during installation, set: IIB_SKIP_OPTIONAL_DEPS=1\n"
            "If you want to install hnswlib, please ensure you have:\n"
            "  - A C++ compiler (gcc/g++ on Linux, clang on macOS, MSVC on Windows)\n"
            "  - Python development headers (python3-dev on Ubuntu)\n"
            "  - Or try: pip install hnswlib --only-binary=:all: for pre-built wheels\n"
            "See: https://github.com/nmslib/hnswlib/issues/403 and #504 for more details."
        ),
        "numpy": (
            "\nNote: numpy installation failed. Ensure your C++ compiler and Python dev headers are installed.\n"
            "To skip optional dependencies, set: IIB_SKIP_OPTIONAL_DEPS=1\n"
            "Core image browsing features will still work without numpy in some cases."
        ),
    }
    return hints.get(package_name, "")

with open(req_file) as file:
    for package in file:
        try:
            package = package.strip()
            if not package or package.startswith("#"):
                continue
            
            package_name = extract_package_name(package)
            
            # Skip optional packages if IIB_SKIP_OPTIONAL_DEPS is set
            if SKIP_OPTIONAL and package_name in OPTIONAL_PACKAGES:
                print(f"Skipping optional dependency: {package}")
                continue
            
            if not launch.is_installed(dist2package(package_name)):
                launch.run_pip(f"install \"{package}\"", f"sd-webui-infinite-image-browsing requirement: {package}")
        except Exception as e:
            # Handle Unicode encoding errors on Windows
            try:
                error_msg = str(e)
            except UnicodeEncodeError:
                error_msg = repr(e)
            
            print(f"Error details: {error_msg}")
            
            # Provide helpful hints for optional packages
            hint_msg = get_optional_package_hints(package_name)
            if hint_msg:
                print(hint_msg)
            else:
                print(f"Warning: Failed to install {package}, some features may not work.")
            
            print()
