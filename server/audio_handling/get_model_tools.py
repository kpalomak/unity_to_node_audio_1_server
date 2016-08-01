#!/usr/bin/python
import re 
import sys

# reads target words from a list, searches them from lexicon file and extracts the corresponding phonemes
def get_word_models_from_lex(Target_words,name_lex_in):
	# Input parameters: 
	# Target_words : list of target words
	# name_lex_in : input lexicon file name from where to search target words
	# Output:
	# name_word_models_no_duplicates: word models as a list with duplicates removed
	name_list_of_word_models=[]
	
	# scan through the input lexicon
	with open(name_lex_in,'r') as f_lex:
		for f_line in f_lex:
			for target_word in Target_words:
				# in line of lexicon file get rid of the target word and extract 
				# the word model that follows the target word 				
				match_seq=target_word+'\('
				list_of_items=re.match(match_seq,f_line,re.M|re.I)
				if list_of_items:
					name_word_models = re.sub('.*\) ','',f_line,1)
					name_word_models = re.sub(r'\n','',name_word_models)
					name_list_of_word_models_temp=name_word_models.split(' ')
					for name_word_models in name_list_of_word_models_temp:
						name_list_of_word_models.append(name_word_models)
	f_lex.close()
	name_word_models_no_duplicates=[]

	# one word model can be many times in a list and needs to be removed
	for name_word_model in name_list_of_word_models:
		cnt_dup=0
		for name_word_model_dup in name_list_of_word_models:
			if name_word_model_dup==name_word_model:
				cnt_dup=cnt_dup+1
		if cnt_dup<2:				
			name_word_models_no_duplicates.append(name_word_model)
	#print len(name_word_models_no_duplicates),len(name_list_of_word_models)

	return name_word_models_no_duplicates


