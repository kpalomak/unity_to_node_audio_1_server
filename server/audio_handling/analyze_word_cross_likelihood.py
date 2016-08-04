#!/usr/bin/env python
import numpy as np

cnt_list=0
cnt_word=0

target_likelihood=[]

target_word_old='it'
likelihood_old=-4.93704160993

name_input='log_a.txt'

line_vec=[]
with open(name_input) as f_cross:
	for line in f_cross:
		line_vec.append(line)
		#print line


le=len(line_vec)
print 'length',le
word_mat = np.zeros(le)
print word_mat

for line in line_vec:
	line_splitted=line.split()
	print line_splitted
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
			print target_word, acoustic_word, likelihood, cnt_list, cnt_word, wav_name
		print word_mat
		word_mat[cnt_list]=likelihood

			#likelihood_old=likelihood

		cnt_list=cnt_list+1			


med=np.median(word_mat)
mean=word_mat.mean()

print "kekkonen", med,mean
