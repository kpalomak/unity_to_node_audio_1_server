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
from cross_likelihood_tools import collect_word_names, compute_cross_likelihood, compute_background_word_model_likelihood, write_cross_likelihood_log, collect_scores_from_history, compute_score

target_word = sys.argv[1]
wav_name = sys.argv[2]
speaker_path = sys.argv[3]
adaptation_matrix_name = sys.argv[4]
print adaptation_matrix_name
flag_use_adaptation = sys.argv[5]
n_anchors=5; # number of random anchor words
word_list_name='/home/siak/siak/aalto_recordings/prompts/wordlist_random.txt'
lex_name=sys.argv[6]
model_dir='/home/siak/models/clean-am/'
cfg_name='/home/siak/models/clean-am/siak_clean_b.cfg'
path_word_cross_likelihoods = speaker_path + "/word_cross_likelihoods/"
num_history=100
flag_verbose = 0

word_names=collect_word_names(word_list_name,target_word,n_anchors)

likelihood_target_word=compute_cross_likelihood(target_word, lex_name, wav_name, flag_use_adaptation, adaptation_matrix_name, cfg_name, model_dir, speaker_path, flag_verbose)

likelihood_background_model=compute_background_word_model_likelihood(word_names, lex_name, wav_name, flag_use_adaptation, adaptation_matrix_name, cfg_name, model_dir, speaker_path, flag_verbose)

write_cross_likelihood_log(path_word_cross_likelihoods, target_word, likelihood_background_model, likelihood_target_word, flag_use_adaptation)

[scores,scores_neg]=collect_scores_from_history(path_word_cross_likelihoods,num_history,flag_verbose)

score=compute_score(scores, scores_neg, likelihood_target_word, likelihood_background_model, flag_verbose)

if flag_verbose > 0: 
	sys.stderr.write('scores: ' + str(score) + '\n') 	
	sys.stderr.write('likelihood_background_model: '  + str(likelihood_background_model) + '\n')
	sys.stderr.write('likelihood_target_word: '  + str(likelihood_target_word) + '\n')

f_out=open(speaker_path + "/score_out.txt" , 'w')
f_out.write(str(score))
f_out.close()

