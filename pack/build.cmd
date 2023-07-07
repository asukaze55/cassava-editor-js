CALL perl toModule.pl < ../cassava_replacer.js > src/cassava_replacer.js
CALL perl toModule.pl < ../cassava_macro.js > src/cassava_macro.js
CALL perl toModule.pl < ../cassava_grid_data.js > src/cassava_grid_data.js
CALL perl toModule.pl < ../cassava_undo_grid.js > src/cassava_undo_grid.js
CALL perl toModule.pl < ../cassava_dom.js > src/cassava_dom.js
CALL perl toModule.pl < ../cassava_grid.js > src/cassava_grid.js
CALL perl toModule.pl < ../cassava_ui.js > src/cassava_ui.js
CALL tsc src/cassava_ui.js --target es6 --checkJs --noEmit
CALL webpack

SET FILENAME=cassava_min_%date:/=%.js
DEL out\%FILENAME%
RENAME out\cassava_min.js %FILENAME%

CALL perl updateScript.pl %FILENAME% < ..\index.html > out\index.html

COPY ..\cassava_20230520.css out\
COPY ..\sample_macros.js out\
COPY ..\test_macros.js out\
