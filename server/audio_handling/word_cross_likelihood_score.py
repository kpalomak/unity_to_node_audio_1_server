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
log=sys.argv[3]

print log
n_anchors=5;
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


#	recognizer = speechrec.NetworkRecognizer(host, port)

wav_dir= '/home/siak/siak/robs_chopped'
test_wav_dir= '/home/siak/siak-server/process_audio/S10_chop/'

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
test_wav_old=''


	

[word_names,dbg]=collect_word_names(word_list_name,target_word,n_anchors)
wav_name_split=wav_name.split('_');

class Word:
        def __init__(self, _word_name, _audio_word_name,_likelihood,_wav_name):
                self.word_name=_word_name
                self.audio_word_name=_audio_word_name
                self.likelihood=_likelihood
                self.wav_name=_wav_name



word_names=np.append(word_names,target_word)
sys.stderr.write(word_names)

for word_name in word_names:
	word_likelihoods=[]
	word_name=word_name.strip()
	sys.stderr.write("dbg " + word_name + "\n")
	cnt_list=0

	sys.stdout = open(log,'a')
	audio_word_name=target_word
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

likelihood_target_word=word_obj.likelihood

name_input='log_a.txt'

line_vec=[]
with open(name_input) as f_cross:
	for line in f_cross:
		line_vec.append(line)
		#print line


le=len(line_vec)
word_mat = np.zeros(le)

cnt_list=0
cnt_word=0

target_likelihood=[]

for line in line_vec:
	line_splitted=line.split()
	if len(line_splitted) > 2:
		target_word=line_splitted[0]
		target_word=target_word.strip()
		acoustic_word=line_splitted[1]
		acoustic_word=acoustic_word.strip()
		wav_name=line_splitted[3]
		wav_name=wav_name.strip()			
		likelihood=float(line_splitted[2])
		if target_word == acoustic_word:
			target_likelihood.append(likelihood)
			#print target_word, acoustic_word, likelihood, cnt_list, cnt_word, wav_name
		#print word_mat
		word_mat[cnt_list]=likelihood


		cnt_list=cnt_list+1			


med=np.median(word_mat)
mean=word_mat.mean()

f_wcl=open(target_word + "_word_cross_likelihoods.txt","a")
write_str=str(mean) + "," + str(likelihood_target_word) + "\n"
f_wcl.write(write_str)
f_wcl.close()
sys.stderr.write(write_str)
