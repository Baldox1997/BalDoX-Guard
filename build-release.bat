@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set RUSTUP_HOME=D:\Projects\fernandotanaka-dev\.rustup
set CARGO_HOME=D:\Projects\fernandotanaka-dev\.cargo
set PATH=%CARGO_HOME%\bin;%PATH%
set CARGO_TARGET_DIR=D:\Projects\fernandotanaka-dev\smart-pc-manager\src-tauri\target
set TEMP=D:\Projects\fernandotanaka-dev\tmp
set TMP=D:\Projects\fernandotanaka-dev\tmp
cd /d D:\Projects\fernandotanaka-dev\smart-pc-manager
npm run tauri build
