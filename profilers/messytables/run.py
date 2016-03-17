#!/usr/bin/env python

import sys
import getopt

from messytables import CSVTableSet, type_guess, \
  types_processor, headers_guess, headers_processor, \
  offset_processor, any_tableset

def usage():
  print "Invalid options, must supply -f"

def process(filename):
  fh = open(filename, 'rb')

  # Load a file object:
  table_set = CSVTableSet(fh)

  # A table set is a collection of tables:
  row_set = table_set.tables[0]

  # A row set is an iterator over the table, but it can only
  # be run once. To peek, a sample is provided:
  row_set.sample.next()

  # guess header names and the offset of the header:
  offset, headers = headers_guess(row_set.sample)
  row_set.register_processor(headers_processor(headers))

  # add one to begin with content, not the header:
  row_set.register_processor(offset_processor(offset + 1))

  # guess column types:
  column_types = type_guess(row_set.sample, strict=False, all_guesses=True)

  # import ipdb; ipdb.set_trace()

  for i, column_type in enumerate(column_types):
    print "%s;" % (headers[i]),
    for guess, score in column_type:
      print "%s:%d;" % (guess, score),
    print

def main(argv):
  try:
    opts, args = getopt.getopt(argv, "f:")
  except getopt.GetoptError:
    usage()
    sys.exit(1)

  filename = None

  for opt, arg in opts:
    if opt == '-f':
      filename = arg

  if filename is None:
    usage()
  else:
    sys.stderr.write("Now processing " + filename + "\n")
    process(filename)

if __name__ == "__main__":
  main(sys.argv[1:])
