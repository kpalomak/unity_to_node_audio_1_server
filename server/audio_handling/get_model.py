#!/usr/bin/python
import re 
import sys
from get_model_tools import get_word_models_from_lex

###############
target_word=sys.argv[1]
name_lex_in=sys.argv[2] #'/home/siak/models/clean-am/words.lex'

#print "target word",target_word
#print "name lex", name_lex_in

names=get_word_models_from_lex([target_word],name_lex_in)

for name in names:
	sys.stdout.write(name + "\n")

sys.stdout.write("\n")

