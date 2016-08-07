#!/usr/bin/env python
# Kalle Palomaki 2016
# SIAK - script for computing pronunciation score using likelihoods scores of aligned triphone models
# The method computes a background likelihood score as difference of the likelihood of the target word
# and background model. The background model likelihood is computed as an average likelihood of randomly
# selected set of anchor words the same audio file. If the likelihood for the target word is much
# higher than it is for the random anchor words, then score is good.

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
	name_array=np.array(name_array)	
	name_array=name_array[rand_perm]
	sys.stderr.write(str(rand_perm))
	return name_array


def get_likelihood(f_name):
	with open(f_name,'r') as f_rob:
		for line in f_rob:
			if 'Total' in line:
				line_splitted=line.split()
				likelihood=float(line_splitted[4])
			if 'filled' in line:
				line_splitted=line.split()
				line_splitted=line_splitted[2]
				line_splitted=line_splitted.split('-')
				nu_frames=float(line_splitted[1])
	
	likelihood=likelihood/nu_frames
	return likelihood


def sorted_ls(path):
    mtime = lambda f: os.stat(os.path.join(path, f)).st_mtime
    return list(sorted(os.listdir(path), key=mtime))



def compute_word_likelihood(word_name, lex_name, wav_name, flag_use_adaptation, adaptation_matrix_name, cfg_name):
	model_name=model_dir + '/' + word_name + '/' + word_name
	cmd_test = './audio_handling/shell_script_aligner_quick.sh ' + word_name + ' ' + lex_name + ' ' + wav_name +  ' label_test_quick ' + model_name + ' ' + word_name + '_quick.phn ' + flag_use_adaptation + ' ' + adaptation_matrix_name +' ' + cfg_name + ' >& tmp_quick.txt'
	sys.stderr.write(cmd_test + '\n')
	os.system(cmd_test)
	likelihood=get_likelihood('tmp_quick.txt')
	return likelihood


def compute_background_model_likelihood(word_names, lex_name, wav_name, flag_use_adaptation, adaptation_matrix_name, cfg_name):
	word_likelihoods=[]	
	for word_name in word_names:
		word_name=word_name.strip()
		sys.stderr.write("dbg " + word_name + "\n")
		cnt_list=0
		likelihood=compute_word_likelihood(word_name, lex_name, wav_name, flag_use_adaptation, adaptation_matrix_name, cfg_name)
		word_likelihoods.append(likelihood)
		print(word_name + ' ' +  str(likelihood) + ' ' + str(wav_name))			
		cnt_list=cnt_list+1
	# last one in the list is the target word	
	#likelihood_target_word=likelihood
	word_mat=np.array(word_likelihoods)
	likelihood_background_model=word_mat.mean()
	return likelihood_background_model

def write_cross_likelihood_log(path_word_cross_likelihoods, target_word, likelihood_background_model, likelihood_target_word):
	if flag_use_adaptation==1:
		ada_text="ada";
	else:
		ada_text=""

	f_wcl=open(path_word_cross_likelihoods + target_word + ada_text + "_word_cross_likelihoods.txt","a")
	write_str=str(likelihood_background_model) + "," + str(likelihood_target_word) + "\n"
	f_wcl.write(write_str)
	f_wcl.close()	

def collect_scores_from_history(path_word_cross_likelihoods,num_history):
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

	return scores, scores_neg

def compute_score(scores,scores_neg):
	scores_0_perc = np.percentile(scores,0)
	scores_20_perc = np.percentile(scores,20)
	scores_60_perc = np.percentile(scores,60)
	
	scores_neg_0_perc = np.percentile(scores_neg,0)
	scores_neg_20_perc = np.percentile(scores_neg,20)
	scores_neg_60_perc = np.percentile(scores_neg,60)
	
	scores_min=min(scores)
	scores_neg_min=min(scores_neg)
	
	sys.stderr.write(str(scores_0_perc) + " " + str(scores_20_perc) + " " + str(scores_60_perc) + " " + " " + str(scores_min) + '\n')
	sys.stderr.write(str(scores_neg_0_perc) + " " + str(scores_neg_20_perc) + " " + str(scores_neg_60_perc) + " " + " " + str(scores_neg_min) + '\n')
	sys.stderr.write("difference of target and background " + str(likelihood_target_word-likelihood_background_model) + "\n")

	likelihood_diff=likelihood_target_word-likelihood_background_model
	
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
	return scores_out

word_names=collect_word_names(word_list_name,target_word,n_anchors)

likelihood_target_word=compute_word_likelihood(target_word, lex_name, wav_name, flag_use_adaptation, adaptation_matrix_name, cfg_name)

likelihood_background_model=compute_background_model_likelihood(word_names, lex_name, wav_name, flag_use_adaptation, adaptation_matrix_name, cfg_name)

write_cross_likelihood_log(path_word_cross_likelihoods, target_word, likelihood_background_model, likelihood_target_word)

[scores,scores_neg]=collect_scores_from_history(path_word_cross_likelihoods,num_history)

score=compute_score(scores,scores_neg)

sys.stderr.write('scores: ' + str(score) + '\n') 	
sys.stderr.write('likelihood_background_model: '  + str(likelihood_background_model) + '\n')



