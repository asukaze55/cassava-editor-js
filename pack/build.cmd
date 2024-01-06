@ECHO OFF
PUSHD ..
FOR %%F IN (cassava_*.js) DO CALL perl %~DP0toModule.pl < %%F > %~DP0src\%%F
POPD
CALL tsc src/cassava_menu.js --target es2022 --checkJs --noEmit --noImplicitAny
CALL webpack

SET FILENAME=cassava_min_%date:/=%.js
DEL out\%FILENAME%
RENAME out\cassava_min.js %FILENAME%

CALL perl updateScript.pl %FILENAME% < ..\index.html > out\index.html

COPY ..\sample_macros.js out\
COPY ..\test_macros.js out\
