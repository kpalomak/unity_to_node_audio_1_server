#!/usr/bin/env python

import re
import sys
import os
from state_tools import find_states_mapping, replace_states
from shrink_aku_model_tools import get_word_models_from_lex, read_hmms_from_ph, find_HMMs_mapping, replace_HMM_indices, read_gk, write_gk, write_phn, read_mc, find_gaussian_mapping, write_mc

dir_models='/home/siak/models/clean-am/'
name_lex='/home/siak/models/clean-am/words.lex'
name_ph='/home/siak/models/clean-am/siak_clean_b.ph'
name_mc='/home/siak/models/clean-am/siak_clean_b.mc'
name_gcl='/home/siak/models/clean-am/siak_clean_b.gcl'
name_gk='/home/siak/models/clean-am/siak_clean_b.gk'
name_dur='/home/siak/models/clean-am/siak_clean_b.dur'

word_list='/home/siak/siak/aalto_recordings/prompts/wordlist_random.txt'
Target_words=['_'] #'too','__']
Target_words=['_','__','safe','too'];
#Target_words=['_','__','age','am','and','ant','arm','art','at','back','bag','bark','be','bee','big','buy']


with open(word_list,'r') as f_word_list:
	for word in f_word_list:		
		word_list=[word.strip()]
		word_list.append('__')
		dir_new_model=dir_models + str(word.strip()) + '/'
		if not os.path.exists(dir_new_model):
			os.makedirs(dir_new_model)
		list_word_models=get_word_models_from_lex(word_list,dir_new_model + word.strip() + '.lex',name_lex)
		print word_list
		print list_word_models
		print dir_new_model
		HMMs_old_as_list=read_hmms_from_ph(list_word_models, name_ph)
		print HMMs_old_as_list

		[HMM_idx_mapped,HMM_count]=find_HMMs_mapping(HMMs_old_as_list)
		states_mapped=find_states_mapping(HMMs_old_as_list)

		HMMs_idx_mapped=replace_states(HMMs_old_as_list,states_mapped)
		HMMs_idx_mapped=replace_HMM_indices(HMM_idx_mapped)

		write_phn(HMMs_idx_mapped, dir_new_model + word.strip() + '.ph',HMM_count)

		# adds gaussian's indices
		[states_mapped,num_gauss_cumu]=read_mc(name_mc,states_mapped)

		[states_mapped,gaussians_mapped]=find_gaussian_mapping(states_mapped)

		#print states_mapped
		if 0:
			for state in states_mapped:
				print state.new, state.old, state.num_gauss_per_state 
				print 'idx_old',state.gaussian_idx_old
				print 'idx_new',state.gaussian_idx_new

		write_mc(states_mapped, dir_new_model + word.strip() + '.mc')


		gaussians_mapped=read_gk(gaussians_mapped,name_gk)

		write_gk(states_mapped, dir_new_model + word.strip() + '.gk',num_gauss_cumu,gaussians_mapped)

