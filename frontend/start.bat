@echo off
echo ========================================
echo 公文高高 - 前端服务启动
echo ========================================
cd /d "%~dp0"
echo.
echo 安装依赖（如需要）...
call npm install
echo.
echo 启动开发服务器...
echo 前端地址: http://localhost:5173
echo.
call npm run dev
pause
