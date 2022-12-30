while (<STDIN>) {
  if (/cassava_replacer.js/ || /cassava_macro.js/) {
    # pass
  } else {
    s/cassava_grid.js/$ARGV[0]/;
    print;
  }
}
