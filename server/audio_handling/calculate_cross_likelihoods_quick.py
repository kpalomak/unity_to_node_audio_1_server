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

log=sys.argv[2]

print log

sys.stdout = open(log,'w')

subject_name='S10_pronunciation_' #'heikki'
word_list_name='/home/siak/siak/aalto_recordings/prompts/wordlist_random.txt'
lex_name='/home/siak/models/clean-am/words_utf-8.lex'
#model_name='/home/siak/models/mc-am/siak_mc_a'
#model_name='/home/siak/models/clean-am/siak_clean_b'
#model_name='/home/siak/models/clean-am/siak_clean_b'
#model_name='/home/siak/models/wsjcam_orig/wsj_284_ml_gain4000_occ400_17.11.2010_25/wsj_284_ml_gain4000_occ400_17.11.2010_25'
model_dir='/home/siak/models/clean-am/'
cfg_name='/home/siak/models/clean-am/siak_clean_b.cfg'
sys.stdout.close()

def collect_word_names(list_name):
	with open(list_name, "r") as ins:
    		name_array = []
    		for line in ins:
       		 	name_array.append(line)
	return name_array

corpus_dir = sys.argv[1]
#	recognizer = speechrec.NetworkRecognizer(host, port)
	#wav_dir = os.path.join(corpus_dir, 'aalto_recordings', 'wav_16b', '16k', 'manual_labelling', 'split')
wav_dir= '/home/siak/siak/robs_chopped'
test_wav_dir= '/home/siak/siak-server/process_audio/S10_chop/'
wav_target_dir = os.path.join(corpus_dir,'aalto_recordings','robs_16k_padded')
wav_name_body = os.path.join(test_wav_dir, subject_name) #+'_apina-')

flag_rob=0
sys.stdout.close()

fs=16000;

class Alignment:
	def __init__(self, _start, _end, _triphone):
		self.start=_start
		self.end=_end
		self.dur=_end-_start
		self.triphone=_triphone

def align(phn_name):
	alignment_vec=[]
	with open(phn_name,'r') as f_phn:
		for line in f_phn:
			#print line
			phn_items=line.split()
			start_sample=float(phn_items[0])/fs 
			end_sample=float(phn_items[1])/fs
			triphone=phn_items[2]
			alignment_vec.append(Alignment(start_sample,end_sample,triphone))
			#print start_sample,end_sample, triphone


	f_phn.close()
	return alignment_vec

def clamp(vec, minn, maxn):
	vec_out=[]
	for n in vec:
		vec_out.append(max(min(maxn, n), minn))
	return vec_out

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

cnt_cumu_avg=0	
rel_err_cumu=0
rel_err_norm_cumu=0
likelihood_diff_cumu=0
test_wav_old='/home/siak/siak-server/process_audio/S10_chop/S10_pronunciation_91.wav'
test_wav_old=''

def collect_wav_names(name_array):
	cnt_arr=0
	wav_name_array=[]
	for word_name in name_array: #cnt_list in range (1,30):
		word_name=word_name.strip()	
		cnt_test=cnt_arr+1 
 		if cnt_test <= -1: #
        		test_wav_name = wav_name_body + '0' + str(cnt_test) + '.wav'
        	else:
                	test_wav_name = wav_name_body + str(cnt_test) + '.wav'
		wav_name_array.append(test_wav_name)
		cnt_arr=cnt_arr+1

	return wav_name_array
	

word_names=collect_word_names(word_list_name)
wav_names=collect_wav_names(word_names)

class Word:
        def __init__(self, _word_name, _audio_word_name,_likelihood,_wav_name):
                self.word_name=_word_name
                self.audio_word_name=_audio_word_name
                self.likelihood=_likelihood
                self.wav_name=_wav_name


for word_name in word_names:
	word_likelihoods=[]
	word_name=word_name.strip()
	cnt_list=0
	for wav_name in wav_names:
		sys.stdout = open(log,'a')
		audio_word_name=word_names[cnt_list]
		audio_word_name=audio_word_name.strip()
		model_name=model_dir + '/' + word_name + '/' + word_name
		cmd_test = './shell_script_aligner_quick.sh ' + word_name + ' ' + lex_name + ' ' + wav_name +  ' label_test_quick ' + model_name + ' ' + word_name + '_quick.phn ' + cfg_name + ' >& tmp_quick.txt'
		sys.stderr.write(cmd_test + '\n')
		os.system(cmd_test)
		os.system('cat tmp_quick.txt')
		word_obj = Word(word_name,audio_word_name,get_likelihood('tmp_quick.txt'),wav_name)
		word_likelihoods.append(word_obj)
		sys.stderr.write(word_obj.word_name + ' ' + word_obj.audio_word_name + ' ' +  str(word_obj.likelihood) + '\n')			
		print(word_obj.word_name + ' ' + word_obj.audio_word_name + ' ' +  str(word_obj.likelihood) + ' ' + str(word_obj.wav_name))			
		#sys.stderr.write('likelihood diff ' + str(likelihood_diff) + ' cumu ' + str(likelihood_diff_cumu) + '\n')	
		sys.stdout.close()
 		cnt_list=cnt_list+1

