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
from cross_likelihood_tools import collect_audio_file_names, compute_cross_likelihood, compute_background_audio_model_likelihood, write_cross_likelihood_log, collect_scores_from_history, compute_score

target_word = sys.argv[1]
speaker_path = sys.argv[2]
adaptation_path = speaker_path + '/ada'
adaptation_matrix_name = sys.argv[3]
flag_use_adaptation = sys.argv[4]
n_anchors=10; # number of random anchor words
word_list_name='/home/siak/siak/aalto_recordings/prompts/wordlist_random.txt'
lex_name=sys.argv[5]
model_dir='/home/siak/models/clean-am/'
cfg_name='/home/siak/models/clean-am/siak_clean_b.cfg'
path_audio_background_likelihoods = speaker_path + "/audio_background_likelihoods/"
num_history=100
flag_verbose = 2

if flag_verbose >0:
	sys.stderr.write("Running background model\n")

wav_names=collect_audio_file_names(adaptation_path, target_word, n_anchors, flag_verbose)

likelihood_background_model=compute_background_audio_model_likelihood(wav_names, lex_name, target_word, flag_use_adaptation, adaptation_matrix_name, cfg_name, model_dir, speaker_path, flag_verbose)

write_cross_likelihood_log(path_audio_background_likelihoods, target_word, likelihood_background_model, 0, flag_use_adaptation)

