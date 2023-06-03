$x = 0;
while (<>) {
  if (/#ifdef MODULE/) {
    $x = 1;
    print "\n"
  } elsif (/#else/ || /#ifndef MODULE/) {
    $x = 2;
    print "\n"
  } elsif (/#endif/) {
    $x = 0;
    print "\n"
  } elsif ($x == 0) {
    print;
  } elsif ($x == 1) {
    s/^\/\/\s*//;
    print;
  } else {
    print "\n"
  }
}
