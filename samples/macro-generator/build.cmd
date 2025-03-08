@ECHO OFF
CALL tsc cms.js --target es2022 --checkJs --noImplicitAny --noEmit
CALL webpack

SET FILENAME=cms_%date:/=%.js
DEL out\%FILENAME%
RENAME out\cms_min.js %FILENAME%

CALL perl -pe s/cms.js/%FILENAME%/ < index.html > out\index.html
