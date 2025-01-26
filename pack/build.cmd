@ECHO OFF
PUSHD ..
FOR %%F IN (cassava_*.js) DO CALL perl %~DP0toModule.pl < %%F > %~DP0src\%%F
POPD
CALL tsc src/cassava_menu.js --target es2022 --checkJs --noImplicitAny --declaration --emitDeclarationOnly --outDir decl
CALL webpack

SET FILENAME=cassava_min_%date:/=%.js
DEL out\%FILENAME%
RENAME out\cassava_min.js %FILENAME%

CALL perl updateScript.pl %FILENAME% < ..\index.html > out\index.html

SET DECLFILENAME=cassava_min_%date:/=%.d.ts
CALL perl updateDeclaration.pl < decl\cassava_grid.d.ts > out\%DECLFILENAME%

COPY ..\sample_macros.js out\
COPY ..\test_macros.js out\
