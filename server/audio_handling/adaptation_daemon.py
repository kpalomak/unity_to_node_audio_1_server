#!/usr/bin/python

import time
import os
from get_model_tools import get_word_models_from_lex 

adaptation_check_interval_sec=5
recipe_name="test.recipe"
speaker_id="S1"
spk_in="default.spkc"
spk_out=speaker_id + "_10words.spkc"
iteration=1
flag=1
path_audio='../upload_data/from_game/foo/ada'
model_name="/home/siak/models/clean-am/siak_clean_b"
cfg_name= "/home/siak/models/clean-am/siak_clean_b.cfg"  
name_lex_in='/home/siak/models/clean-am/words.lex'
#name_lex_in='/home/siak/models/clean-am/words_utf-8.lex'
name_lex_out='dummy.lex'
name_word_list="/home/siak/siak/aalto_recordings/prompts/wordlist_random.txt"
adaptation_log="adaptation_log.txt"


flag_align=0
flag_recipe=1

words_in_list=143
num_utt_in_ada=5


#if flag_recipe:

def parse_audio_file_name(name_audio_file):
	name_audio_file=name_audio_file.split('_')
	#print "dbg",name_audio_file
	speaker=name_audio_file[0]
	unknown=name_audio_file[1]
	word=name_audio_file[2]
	return speaker, word

def make_recipe(recipe_name,path_audio,name_word_list,audio_files_list,speaker_id,flag_recipe_align):
	cnt=1
	f_recipe=open(recipe_name,"w")
	for audio_file in audio_files_list:
		#print audio_file
		[speaker,word]=parse_audio_file_name(audio_file)
		print speaker,word
		if flag_recipe_align==1:
			recipe_line="audio=" + path_audio + '/' + audio_file + " transcript=" + "./phns_in/" + word + ".phn" + " alignment=./phns_out/" + word + ".phn speaker=" + speaker_id + "\n"
			name_models=get_word_models_from_lex([word],name_lex_in)
			f_phn=open("./phns_in/" + word + ".phn", "w");
			f_phn.write("__\n")
			for name_model in name_models:
				f_phn.write(name_model + "\n")
			f_phn.write("__\n")
			f_phn.close()
		else:
				recipe_line="audio=" + path_audio + '/' + audio_file + " transcript=" + "./phns_out/" + word + ".phn" + " alignment=./phns_out/" + word + ".rawseg speaker=" + speaker_id + "\n"
#			if (cnt > words_in_list-utt_in_ada):		
#				print recipe_line
		print recipe_line
		f_recipe.write(recipe_line)
		cnt=cnt+1
	f_recipe.close()

#if flag_align:
def align(recipe_name,model_name,cfg_name):
	cmd = "align -i 2 --swins=100000 -b " + model_name + " -c " + cfg_name + " -r " + recipe_name

        os.system(cmd)

def adapt(iteration,model_name,cfg_name,recipe_name,spk_in,spk_out):
	spk_out_tmp="tmp_" + spk_out
	for i in range(0,iteration):
		cmd = "mllr -b " + model_name + " -c " + cfg_name + " -r " + recipe_name + " -S " + spk_in + " --out " + spk_out_tmp + " --mllr mllr -i 1"
		spk_in=spk_out_tmp
		print cmd
		os.system(cmd)
	os.rename(spk_out_tmp,spk_out) # need to have an atomic operation to ensure that file is fully written when it appears in the filesystem


def daemon(adaptation_check_interval_sec,player_path):
	while flag==1:
		print "kekkonen"
		player_audio_files_list=os.listdir(path_audio)
		num_audio_files=len(player_audio_files_list)
		try:
		   	with open(adaptation_log) as f:
				num_audio_files_last_round=f.readline()
				f.close()
		except:
			num_audio_files_last_round=0
		num_audio_files_last_round = int(num_audio_files_last_round)
		print (num_audio_files > num_utt_in_ada)
		print (num_audio_files > num_audio_files_last_round)
		print num_audio_files, num_audio_files_last_round
		if (num_audio_files > num_utt_in_ada) and (num_audio_files > num_audio_files_last_round):
			make_recipe(recipe_name,path_audio,name_word_list,player_audio_files_list,speaker_id,1)
			align(recipe_name,model_name,cfg_name)
			make_recipe(recipe_name,path_audio,name_word_list,player_audio_files_list,speaker_id,0)
			adapt(iteration,model_name,cfg_name,recipe_name,spk_in,spk_out)
			f_adaptation_log=open(adaptation_log,'w')
			f_adaptation_log.write(str(num_audio_files))
			f_adaptation_log.close()

			
		time.sleep(adaptation_check_interval_sec)


daemon(adaptation_check_interval_sec,path_audio)

