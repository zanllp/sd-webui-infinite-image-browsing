# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Stable Diffusion webui Infinite Image Browsing** - a powerful image management and browsing extension that supports multiple AI software platforms including Stable Diffusion webui, ComfyUI, Fooocus, NovelAI, StableSwarmUI, and Invoke.AI. The project consists of a Python FastAPI backend and a Vue.js frontend with optional Tauri desktop app support.

## Architecture

### Backend (Python)
- **Main entry**: `app.py` - FastAPI application entry point
- **API layer**: `scripts/iib/api.py` - Core API endpoints and business logic
- **Database**: `scripts/iib/db/` - SQLite database models and operations
- **Parsers**: `scripts/iib/parsers/` - Parsers for different AI software metadata formats
- **Core utilities**: `scripts/iib/tool.py` - Shared utilities and helper functions

### Frontend (Vue.js)
- **Location**: `vue/` directory
- **Framework**: Vue 3 + TypeScript + Vite
- **UI Library**: Ant Design Vue
- **State management**: Pinia
- **Build system**: Vite with custom build script

### Desktop App (Optional)
- **Framework**: Tauri (Rust + Vue frontend)
- **Config**: `vue/src-tauri/` - Tauri configuration and Rust backend

## Development Commands

### Python Backend
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run standalone server (without SD-webui)
python app.py --port 8000 --host 127.0.0.1

# Common CLI arguments:
# --generate_image_cache: Pre-generate image thumbnails
# --generate_video_cover: Pre-generate video covers
# --sd_webui_config: Path to SD-webui config file
```

### Vue Frontend
```bash
cd vue

# Install dependencies
yarn

# Development server with hot reload
yarn dev

# Type checking
yarn type-check

# Production build
yarn build
```

### Tauri Desktop App
```bash
cd vue

# Development with Tauri
yarn tauri

# Build desktop app
yarn tauri-build

# Debug build
yarn tauri-build-debug
```

## Key Configuration

### Environment Variables (.env)
- `IIB_SECRET_KEY`: Authentication key
- `IIB_CACHE_DIR`: Custom cache directory
- `IIB_ACCESS_CONTROL`: File system access control (auto/enable/disable)
- `IIB_SERVER_LANG`: Server language (zh/en/auto)

### Development Proxy
The Vue dev server proxies `/infinite_image_browsing/` requests to `http://127.0.0.1:7866/` (default SD-webui port).

## Database and Caching

- **Database**: SQLite (`iib.db`) with automatic backups
- **Image cache**: Thumbnails and metadata cached for performance
- **Video covers**: Generated covers for video files
- **Parsers**: Extract metadata from different AI software formats

## Important Files

- `app.py`: Standalone server entry point
- `scripts/iib/api.py`: Main API implementation
- `vue/src/main.ts`: Frontend entry point
- `vue/vite.config.ts`: Build configuration
- `.env.example`: Configuration template
- `requirements.txt`: Python dependencies
- `vue/package.json`: Frontend dependencies

## Running as Extension vs Standalone

The project can run as:
1. **SD-webui extension**: Integrated into Stable Diffusion webui
2. **Standalone Python app**: Independent server using `app.py`
3. **Desktop application**: Using Tauri wrapper

When developing, test both standalone mode and extension mode if making changes that affect integration points.