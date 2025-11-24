while (<STDIN>) {
  if (/tooned.js/) {
    s/tooned.js/$ARGV[0]/;
    print;
  } elsif (/"\w+\.js"/) {
    # pass
  } else {
    print;
  }
}
