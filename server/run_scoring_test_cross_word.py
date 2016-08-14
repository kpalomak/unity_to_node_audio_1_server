#!/usr/bin/python

import os
import numpy
import shutil

#subject_name='S9_pronunciation_'
subject_name='eng1_'
word_list_name='/home/siak/siak/aalto_recordings/prompts/wordlist_random.txt'
#word_list_name='./word_list_3words.txt'
#test_wav_dir= '/home/siak/siak-server/process_audio/S9_chop/'
test_wav_dir= '/home/siak/siak-server/process_audio/saris_eng1_recoding_chopped/'
wav_name_body = os.path.join(test_wav_dir, subject_name)
lex_name = '/home/siak/models/clean-am/words.lex'
speaker_path = '/home/siak/node_server_kalle/server/saris_eng1_chop'
flag_use_adaptation = 1
flag_estimate_adaptation_matrix = 0
model_name='/home/siak/models/clean-am/siak_clean_b'
adaptation_matrix_name=speaker_path + '/S'
 
def collect_word_names(list_name):
        with open(list_name, "r") as ins:
                name_array = []
                for line in ins:
			line=line.strip()
                        name_array.append(line)
        return name_array


def collect_wav_names(name_array,wav_name_body):
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

def run_adaptation(target_dir,lexicon,model,adaptation_matrix_name):
	cmd = '~/node-v4.4.5-linux-x64/bin/node ./audio_handling/adaptation_dbg.js ' + target_dir + ' ' + lexicon + ' ' + model + ' ' + adaptation_matrix_name
	os.system(cmd)

word_list=collect_word_names(word_list_name)

wav_list=collect_wav_names(word_list, wav_name_body)

#print word_list
#print wav_list
rounds=5
name_score_mat=subject_name + 'words_score_mat_rounds_' + str(rounds)
if os.path.exists(name_score_mat + '.npy'):
	flag_run_analysis=0
else:
	flag_run_analysis=1


align_path=speaker_path + "/align"
word_path=speaker_path + "/word_cross_likelihoods"

print align_path
print word_path
if os.path.exists(align_path):
	shutil.rmtree(align_path)
else:
	os.makedirs(align_path)

if os.path.exists(word_path):
	shutil.rmtree(word_path)
else:
	os.makedirs(word_path)

score_mat=numpy.empty((0,len(word_list)))

if flag_estimate_adaptation_matrix:
	run_adaptation(speaker_path, lex_name, model_name,adaptation_matrix_name)

if flag_run_analysis:
	for cnt_rounds in range(0,rounds):
		score_arr=numpy.array([])
		cnt_word=0
		for wav_name in wav_list:
			target_word=word_list[cnt_word]
			cmd = "./audio_handling/word_cross_likelihood_score.py " + target_word + " " + wav_name + " " + speaker_path + " " + adaptation_matrix_name + " " + str(flag_use_adaptation) + " " + lex_name
			print cmd
			ret=os.system(cmd)
			if not(ret==0):
				break
			f_score=open(speaker_path + "/" + "score_out.txt", "r")
			score=int(f_score.readline())
			print "score run_scoring:", score, "cnt_word:", cnt_word 
			score_arr=numpy.append(score_arr,score)
			cnt_word = cnt_word + 1
        	print len(score_arr)
		score_mat=numpy.append(score_mat,[score_arr], axis=0)		
		numpy.save(name_score_mat,score_mat)



score_mat=numpy.load(name_score_mat+'.npy')



