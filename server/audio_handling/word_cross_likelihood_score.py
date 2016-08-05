#!/usr/bin/env python
# you can use 02-network.sh to run this stuff
# comments added by Kalle 2.5.2016
# test script that takes in a couple of files heikki-apina*
# run a back end server
# give host url or ip as the first argument
# port as the second argument
#

import sys
import os
import logging
import numpy as np
target_word = sys.argv[1]
wav_name = sys.argv[2]
speaker_path = sys.argv[3]
adaptation_matrix_name = sys.argv[4]
flag_use_adaptation = sys.argv[5]
n_anchors=5;
word_list_name='/home/siak/siak/aalto_recordings/prompts/wordlist_random.txt'
lex_name=sys.argv[6]
model_dir='/home/siak/models/clean-am/'
cfg_name='/home/siak/models/clean-am/siak_clean_b.cfg'
path_word_cross_likelihoods = speaker_path + "/word_cross_likelihoods/"
num_history=100


def collect_word_names(list_name,word,n_anchors):
	with open(list_name, "r") as ins:
    		name_array = []
    		for line in ins:
			if not(word in line):
       		 		name_array.append(line)
	rand_perm=np.random.permutation(len(name_array))
	rand_perm=rand_perm[1:n_anchors]
	sys.stderr.write(str(rand_perm))
	dbg=name_array[91-2]
	name_array=np.array(name_array)	
	name_array=name_array[rand_perm]
	sys.stderr.write(str(rand_perm))
	return name_array,dbg


def get_likelihood(f_name):
	with open(f_name,'r') as f_rob:
		for line in f_rob:
			if 'Total' in line:
				line_splitted=line.split()
				#for item in line_splitted:
				likelihood=float(line_splitted[4])
				#sys.stderr.write(str(likelihood))
			if 'filled' in line:
				line_splitted=line.split()
				line_splitted=line_splitted[2]
				line_splitted=line_splitted.split('-')
				nu_frames=float(line_splitted[1])
				#sys.stderr.write(line)
				#sys.stderr.write('nu_frames' + nu_frames)
	
	likelihood=likelihood/nu_frames
	return likelihood


def sorted_ls(path):
    mtime = lambda f: os.stat(os.path.join(path, f)).st_mtime
    return list(sorted(os.listdir(path), key=mtime))

	

[word_names,dbg]=collect_word_names(word_list_name,target_word,n_anchors)
wav_name_split=wav_name.split('_');



word_names=np.append(word_names,target_word)
sys.stderr.write(word_names)
word_likelihoods=[]

for word_name in word_names:
	word_name=word_name.strip()
	sys.stderr.write("dbg " + word_name + "\n")
	cnt_list=0
	audio_word_name=target_word
	audio_word_name=audio_word_name.strip()
	model_name=model_dir + '/' + word_name + '/' + word_name
	cmd_test = './audio_handling/shell_script_aligner_quick.sh ' + word_name + ' ' + lex_name + ' ' + wav_name +  ' label_test_quick ' + model_name + ' ' + word_name + '_quick.phn ' + flag_use_adaptation + ' ' + adaptation_matrix_name +' ' + cfg_name + ' >& tmp_quick.txt'
	sys.stderr.write(cmd_test + '\n')
	os.system(cmd_test)
	likelihood=get_likelihood('tmp_quick.txt')
	word_likelihoods.append(likelihood)
	print(word_name + ' ' + audio_word_name + ' ' +  str(likelihood) + ' ' + str(wav_name))			
	cnt_list=cnt_list+1

# last one in the list is the target word
likelihood_target_word=likelihood

word_mat=np.array(word_likelihoods)

mean=word_mat.mean()

if flag_use_adaptation==1:
	ada_text="ada";
else:
	ada_text=""

f_wcl=open(path_word_cross_likelihoods + target_word + ada_text + "_word_cross_likelihoods.txt","a")
write_str=str(mean) + "," + str(likelihood_target_word) + "\n"
f_wcl.write(write_str)
f_wcl.close()


list_of_files=sorted_ls(path_word_cross_likelihoods)

num_files=len(list_of_files)
sys.stderr.write(str(num_files) + "\n")

if num_files < num_history:
	num_history=num_files
	
scores=np.array(0)
scores_neg=np.array(0)
for i in range(num_files-num_history,num_files):
	with open(path_word_cross_likelihoods + list_of_files[i]) as f_files:
		for line in f_files:
			line=line.strip()
			line_split = line.split(',')
			diff=float(line_split[1]) - float(line_split[0])
			if diff>0:
				scores=np.append(scores,diff)
			else:
				scores_neg=np.append(scores_neg,diff)

scores_0_perc = np.percentile(scores,0)
scores_20_perc = np.percentile(scores,20)
scores_60_perc = np.percentile(scores,60)

scores_neg_0_perc = np.percentile(scores_neg,0)
scores_neg_20_perc = np.percentile(scores_neg,20)
scores_neg_60_perc = np.percentile(scores_neg,60)

scores_min=min(scores)
scores_neg_min=min(scores_neg)


#sys.stderr.write("dbg: pos: " + str(scores) + '\n' + "dbg: neg: " + str(scores_neg) + "\n")

sys.stderr.write(str(scores_0_perc) + " " + str(scores_20_perc) + " " + str(scores_60_perc) + " " + " " + str(scores_min) + '\n')
sys.stderr.write(str(scores_neg_0_perc) + " " + str(scores_neg_20_perc) + " " + str(scores_neg_60_perc) + " " + " " + str(scores_neg_min) + '\n')
sys.stderr.write(write_str + " " + str(likelihood_target_word-mean) + "\n")

likelihood_diff=likelihood_target_word-mean

if likelihood_diff > 0:
	if likelihood_diff > scores_60_perc:
		scores_out=5
	elif likelihood_diff > scores_20_perc:
		scores_out=4
	elif likelihood_diff > scores_0_perc:
		scores_out=3
else:
    	if likelihood_diff > scores_neg_60_perc:
		scores_out=2
  	elif likelihood_diff > scores_neg_20_perc:
		scores_out=1
	else: 
		scores_out=0

sys.stderr.write('scores: ' + str(scores_out) + '\n') 
sys.stderr.write('mean: '  + str(mean) + '\n')

