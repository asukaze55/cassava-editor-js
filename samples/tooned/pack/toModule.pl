$x = 0;
while (<>) {
  if (/const (\{.*\}) = net\.asukaze\.import\(('.*')\);/) {
    print "import $1 from $2;\n"
  } elsif (/net\.asukaze\.export\((\{.*\})\);/) {
    print "export $1;\n"
  } elsif (/^\(\(\) => \{\r?\n?$/) {
    print "\n"
  } elsif (/^\}\)\(\);\r?\n?$/) {
    print "\n"
  } else {
    print
  }
}
