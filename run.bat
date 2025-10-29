@echo off
echo Starting Project A...
start cmd /k "cd /d D:\projects\projectA && npm run start"

echo Starting Project B...
start cmd /k "cd /d D:\projects\projectB && npm run start"

echo All projects have been started in separate windows.
pause
