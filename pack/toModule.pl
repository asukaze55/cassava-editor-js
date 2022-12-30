$x = 0;
while (<>) {
  if (/#ifdef MODULE/) {
    $x = 1;
  } elsif (/#else/ || /#ifndef MODULE/) {
    $x = 2;
  } elsif (/#endif/) {
    $x = 0;
  } elsif ($x == 0) {
    print;
  } elsif ($x == 1) {
    s/^\/\/\s*//;
    print;
  }
}
