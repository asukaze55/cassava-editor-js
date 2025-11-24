@ECHO OFF
CALL perl  toModule.pl < ..\dom.js > src\dom.js
CALL perl  toModule.pl < ..\tooned.js > src\tooned.js
COPY ..\cassava_min_20250727.d.ts src\
CALL tsc src\tooned.js --target es2022 --checkJs --noImplicitAny --noEmit
CALL webpack

SET FILENAME=tooned_min_%date:/=%.js
DEL out\%FILENAME%
RENAME out\tooned_min.js %FILENAME%

CALL perl updateScript.pl %FILENAME% < ..\index.html > out\index.html
COPY ..\*.css out\
