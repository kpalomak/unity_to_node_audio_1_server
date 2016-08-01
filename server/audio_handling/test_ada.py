#!/usr/bin/python

import os
import sys
from shrink_aku_model_tools import get_word_models_from_lex

model_name="/home/siak/models/clean-am/siak_clean_b"
cfg_name= "/home/siak/models/clean-am/siak_clean_b.cfg"  

recipe_name="test.recipe"
spk_in="default.spkc"
spk_out="S1_10words.spkc"
iteration=1


name_lex_in='/home/siak/models/clean-am/words.lex'
#name_lex_in='/home/siak/models/clean-am/words_utf-8.lex'
name_lex_out='dummy.lex'
word_list="/home/siak/siak/aalto_recordings/prompts/wordlist_random.txt"

flag_align=0
flag_recipe=1
cnt=1

words_in_list=143
utt_in_ada=50

if flag_recipe:
	f_recipe=open(recipe_name,"w")
	with open(word_list,'r') as f_words:
		for word in f_words:
			word=word.strip()
			recipe_line="audio=/home/siak/siak-server/process_audio/S10_chop/S10_pronunciation_" + str(cnt) + ".wav transcript=" + "./phns/" + word + ".phn" + " alignment=./phns/" + word + ".rawseg speaker=S1\n"
			if (cnt > words_in_list-utt_in_ada):		
				print recipe_line
				f_recipe.write(recipe_line)
			cnt=cnt+1
	f_recipe.write('\n')
	f_recipe.close()

if flag_align:
	with open(word_list,'r') as f_words:
		for word in f_words:
			word=word.strip()
			word_models=get_word_models_from_lex([word],name_lex_out,name_lex_in)
			wav_name="/home/siak/siak-server/process_audio/S10_chop/S10_pronunciation_"+ str(cnt)+".wav"
			cmd_test = './shell_script_aligner.sh ' + word + ' ' + name_lex_in + ' ' + wav_name +  ' label_test ' + model_name + ' phns/' + word + '.phn' + ' >& tmp_test.txt'
        	        sys.stderr.write(cmd_test + '\n')
        	        os.system(cmd_test)
			
	

	f_words.close()

for i in range(0,iteration):
	cmd = "mllr -b " + model_name + " -c " + cfg_name + " -r " + recipe_name + " -S " + spk_in + " --out " + spk_out + " --mllr mllr -i 1"
	spk_in=spk_out
	print cmd
	os.system(cmd)


