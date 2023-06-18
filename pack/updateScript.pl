while (<STDIN>) {
  if (/cassava_replacer.js/ || /cassava_macro.js/ || /cassava_grid_data.js/ || /cassava_undo_grid.js/ || /cassava_ui.js/) {
    # pass
  } else {
    s/cassava_grid.js/$ARGV[0]/;
    print;
  }
}
