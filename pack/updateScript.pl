while (<STDIN>) {
  if (/cassava_grid.js/) {
    s/cassava_grid.js/$ARGV[0]/;
    print;
  } elsif (/cassava_.*\.js/) {
    # pass
  } elsif (/module\.js/) {
    # pass
  } else {
    print;
  }
}
