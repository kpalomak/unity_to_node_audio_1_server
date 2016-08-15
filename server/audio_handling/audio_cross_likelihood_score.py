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
from cross_likelihood_tools import collect_audio_file_names, compute_cross_likelihood, compute_background_audio_model_likelihood, write_cross_likelihood_log, collect_scores_from_history, compute_score, read_cross_likelihood_log

target_word = sys.argv[1]
wav_name = sys.argv[2]
speaker_path = sys.argv[3]
adaptation_path = speaker_path + '/ada'
adaptation_matrix_name = sys.argv[4]
flag_use_adaptation = sys.argv[5]
n_anchors=20; # number of random anchor words
word_list_name='/home/siak/siak/aalto_recordings/prompts/wordlist_random.txt'
lex_name=sys.argv[6]
model_dir='/home/siak/models/clean-am/'
cfg_name='/home/siak/models/clean-am/siak_clean_b.cfg'

if flag_use_adaptation:
	adaptation_text='ada_'
else:
	adaptation_text=''

path_audio_cross_likelihoods = speaker_path + "/audio_cross_" + adaptation_text + "likelihoods/"
path_audio_background_likelihoods = speaker_path + "/audio_background_" + adaptation_text + "likelihoods/"
num_history=100
flag_verbose = 2
flag_use_new_background=1
wav_names=collect_audio_file_names(adaptation_path, target_word, n_anchors, flag_verbose)

if not wav_names:
	sys.stderr.write('empyt wavlist\n')
	exit(0)

sys.stderr.write("target_word: " + str(target_word) + " wav_name: " + str(wav_name) + " ")
likelihood_target_word=compute_cross_likelihood(target_word, lex_name, wav_name, flag_use_adaptation, adaptation_matrix_name, cfg_name, model_dir, speaker_path, flag_verbose)
sys.stderr.write(str(likelihood_target_word) + "\n")
#print wav_names

if flag_use_new_background:
	likelihood_background_model=compute_background_audio_model_likelihood(wav_names, lex_name, target_word, flag_use_adaptation, adaptation_matrix_name, cfg_name, model_dir, speaker_path, flag_verbose)
	#[flag_file_found, likelihood_background_model, dummy]=read_cross_likelihood_log(path_audio_background_likelihoods, target_word, flag_use_adaptation,flag_verbose)
	flag_file_found=1

sys.stderr.write("likelihood background model: " + str(likelihood_background_model) + "\n")

if not(flag_file_found):
	cmd="./audio_handling/audio_cross_likelihood_background.py " + target_word + " " + speaker_path + " " + adaptation_path + " 0 " + lex_name
	os.system(cmd);
	[flag_file_found, likelihood_background_model, dummy]=read_cross_likelihood_log(path_audio_background_likelihoods, target_word, flag_use_adaptation, flag_verbose)

if flag_file_found:
	write_cross_likelihood_log(path_audio_cross_likelihoods, target_word, likelihood_background_model, likelihood_target_word, flag_use_adaptation)
	[scores,scores_neg]=collect_scores_from_history(path_audio_cross_likelihoods,num_history,flag_verbose)

	if flag_verbose>=2:
		sys.stderr.write("scores main func: " + str(scores) + '\n')
		sys.stderr.write("scores_neg main func: " + str(scores_neg) + '\n')

	score=compute_score(scores, scores_neg, likelihood_target_word, float(likelihood_background_model), flag_verbose)
	f_out=open(speaker_path + "/score_out.txt" , 'w')
	f_out.write(str(score))
	f_out.close()

	if flag_verbose > 0: 
		sys.stderr.write('scores in main: ' + str(score) + '\n') 	
		sys.stderr.write('likelihood_background_model in main: '  + str(likelihood_background_model) + '\n')
		sys.stderr.write('likelihood_target_word in main: '  + str(likelihood_target_word) + '\n')
else:
	sys.stderr.write("not enough samples\n")
