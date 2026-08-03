@echo off
echo ========================================
echo 公文高高 - 后端服务启动
echo ========================================
cd /d "%~dp0"
echo.
echo [1/2] 检查知识库...
if not exist "app.db" (
    echo 知识库未初始化，正在初始化...
    C:\Python311\python.exe init_knowledge.py
) else (
    echo 知识库已就绪。
)
echo.
echo [2/2] 启动 API 服务...
echo 后端地址: http://127.0.0.1:8000
echo API文档: http://127.0.0.1:8000/docs
echo.
C:\Python311\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
