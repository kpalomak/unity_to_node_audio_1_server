#!/usr/bin/python

import os
import shutil

subject_name='S9_pronunciation_'
word_list_name='/home/siak/siak/aalto_recordings/prompts/wordlist_random.txt'

#word_list_name='./word_list_3words.txt'

test_wav_dir= '/home/siak/siak-server/process_audio/S9_chop/'
wav_name_body = os.path.join(test_wav_dir, subject_name)
path_new = 'S9_chop/ada/'

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


word_list=collect_word_names(word_list_name)
wav_list=collect_wav_names(word_list, wav_name_body)
cnt=0
for word_name in word_list:
	name_new = path_new + "foo_1_" + word_name + "_rest.wav" 
	print name_new
	shutil.copyfile(wav_list[cnt], name_new)
	cnt=cnt+1

