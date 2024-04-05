%1 mshta vbscript:CreateObject("Shell.Application").ShellExecute("cmd.exe","/c %~s0 ::","","runas",1)(window.close)&&exit
@ECHO OFF

:: 这个文件放在aria2里面，在 aria2.conf 写 on-download-complete=rename.bat
:: This file is placed in aria2. Write on-download-complete=rename.bat in aria2.conf.

:: 使用 %0, %1, %2 等变量传递参数，其中 %0 表示脚本本身，%1 表示第一个参数，依此类推
:: Use %0, %1, %2, etc. to pass parameters, where %0 represents the script itself, %1 represents the first parameter, and so on.

:: 使用 set 命令设置变量，例如 %arg1%
::Use the set command to set variables, such as %arg1%

:: 运行这个脚本会获取到并执行另一个文件的路径，这个路径是通过 powershell 执行的 ps 脚本获取的
::Running this script will get and execute the path of another file, this path is obtained by running a ps script with powershell.

set arg1=%1
set arg2=%2
set arg3=%3

node D:\code\nodejs_rename_anime\rename.js %arg1% %arg2% %arg3%

PAUSE
