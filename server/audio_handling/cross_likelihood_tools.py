import numpy
import sys
import os

def collect_word_names(list_name,word,n_anchors):
	with open(list_name, "r") as ins:
    		name_array = []
    		for line in ins:
			if not(word in line):
       		 		name_array.append(line)
	rand_perm=numpy.random.permutation(len(name_array))
	rand_perm=rand_perm[1:n_anchors]
	name_array=numpy.array(name_array)	
	name_array=name_array[rand_perm]
	return name_array

def sorted_ls(path):
    mtime = lambda f: os.stat(os.path.join(path, f)).st_mtime
    return list(sorted(os.listdir(path), key=mtime))

def parse_audio_file_name(name_audio_file):
        name_audio_file=name_audio_file.split('_')
        speaker=name_audio_file[0]
        unknown=name_audio_file[1]
        word=name_audio_file[2]
        return speaker, word

def collect_audio_file_names(adaptation_path, word, n_anchors, flag_verbose):
	# use files picked for adaptation a pronunciation score criterion 
	# to ensure their audio quality
	# pick n_anchors newest files	

	name_array=sorted_ls(adaptation_path + '/')
	name_chosen=[]
	cnt_names=len(name_array)-1
	cnt_chosen=0
	words_str=""
	while (cnt_chosen<n_anchors ) and (cnt_names>=0):
		if not(word in name_array[cnt_names]):
			[speaker,word_audio]=parse_audio_file_name(name_array[cnt_names])
			if not(word_audio in words_str):
				name_chosen.append(name_array[cnt_names])
				cnt_chosen=cnt_chosen+1	
			words_str=words_str + word_audio
		cnt_names=cnt_names-1	
		
	if flag_verbose>=2:
		sys.stderr.write(str(name_chosen) + '\n')
	return name_chosen

def get_likelihood(f_name):
	with open(f_name,'r') as f_rob:
		for line in f_rob:
			if 'Total' in line:
				line_splitted=line.split()
				likelihood=float(line_splitted[4])
			if 'filled' in line:
				line_splitted=line.split()
				line_splitted=line_splitted[2]
				line_splitted=line_splitted.split('-')
				nu_frames=float(line_splitted[1])
	
	likelihood=likelihood/nu_frames
	return likelihood



def compute_cross_likelihood(word_name, lex_name, wav_name, flag_use_adaptation, adaptation_matrix_name, cfg_name, model_dir, speaker_path, flag_verbose):
	# define temp-files required for running aligner, if disk writing becomes too intense could
	# construct a ram disk in the virtual machine
	# http://www.hecticgeek.com/2015/12/create-ram-disk-ubuntu-linux/

	label_test = speaker_path+"/label_test_quick.txt"
	align_output = speaker_path + "/align_output.txt" 
	align_dir = speaker_path + '/align'
	
	model_name=model_dir + '/' + word_name + '/' + word_name
	cmd_test = './audio_handling/shell_script_aligner_quick.sh ' + word_name + ' ' + lex_name + ' ' + wav_name +  ' ' + label_test + ' ' + model_name + ' ' + align_dir + '/'  + word_name + '_quick.phn ' + flag_use_adaptation + ' ' + adaptation_matrix_name +' ' + cfg_name + ' >& ' + align_output
	if flag_verbose >= 2:
		sys.stderr.write(cmd_test + '\n')
	os.system(cmd_test)
	likelihood=get_likelihood(align_output)
	return likelihood


def compute_background_word_model_likelihood(word_names, lex_name, wav_name, flag_use_adaptation, adaptation_matrix_name, cfg_name, model_dir, speaker_path, flag_verbose):
	word_likelihoods=[]	
	for word_name in word_names:
		word_name=word_name.strip()
		if flag_verbose >=2:
			sys.stderr.write("dbg " + word_name + "\n")
		cnt_list=0
		likelihood=compute_cross_likelihood(word_name, lex_name, wav_name, flag_use_adaptation, adaptation_matrix_name, cfg_name, model_dir, speaker_path, flag_verbose)
		word_likelihoods.append(likelihood)
		if flag_verbose >=2:
			sys.stderr.write(word_name + ' ' +  str(likelihood) + ' ' + str(wav_name) + '\n')			
		cnt_list=cnt_list+1
	word_mat=numpy.array(word_likelihoods)
	likelihood_background_model=word_mat.mean()
	return likelihood_background_model

def compute_background_audio_model_likelihood(wav_names, lex_name, target_word_name, flag_use_adaptation, adaptation_matrix_name, cfg_name, model_dir, speaker_path, flag_verbose):
	wav_likelihoods=[]	
	for wav_name in wav_names:
		wav_name=wav_name.strip()
		if flag_verbose >=2:
			sys.stderr.write("dbg " + wav_name + "\n")
		cnt_list=0
		likelihood=compute_cross_likelihood(target_word_name, lex_name, speaker_path + '/ada/' + wav_name, flag_use_adaptation, adaptation_matrix_name, cfg_name, model_dir, speaker_path, flag_verbose)
		wav_likelihoods.append(likelihood)
		if flag_verbose >=2:
			sys.stderr.write(wav_name + ' ' +  str(likelihood) + ' ' + str(wav_name) + '\n')			
		cnt_list=cnt_list+1
	wav_mat=numpy.array(wav_likelihoods)
	likelihood_background_model=wav_mat.mean()
	return likelihood_background_model

def write_cross_likelihood_log(path_word_cross_likelihoods, target_word, likelihood_background_model, likelihood_target_word, flag_use_adaptation):
	if flag_use_adaptation==1:
		ada_text="ada";
	else:
		ada_text=""

	f_wcl=open(path_word_cross_likelihoods + target_word + ada_text + "_word_cross_likelihoods.txt","a")
	write_str=str(likelihood_background_model) + "," + str(likelihood_target_word) + "\n"
	f_wcl.write(write_str)
	f_wcl.close()	


def read_cross_likelihood_log(path_word_cross_likelihoods, target_word, flag_use_adaptation):
	if flag_use_adaptation==1:
		ada_text="ada";
	else:
		ada_text=""
	try:
		f_wcl=open(path_word_cross_likelihoods + target_word + ada_text + "_word_cross_likelihoods.txt","r")
		line=f_wcl.read()
		line_split=line.split(',')
		likelihood_background_model=line_split[0]
		likelihood_target_word=line_split[1]
		f_wcl.close()
		flag_file_found=1
	except:
		likelihood_background_model=-1000
		likelihood_target_word=-1000
		flag_file_found=0

	return flag_file_found, likelihood_background_model, likelihood_target_word

def collect_scores_from_history(path_word_cross_likelihoods,num_history):
	# reads through the history of scores and differintiates them to either negative or positive
	# negative score means that the target word likelihood was less or equal than the backgroung likelihood
	# positive score means that the target word likelihood was greater than the background likelihood  	
	list_of_files=sorted_ls(path_word_cross_likelihoods)
	num_files=len(list_of_files)

	if num_files < num_history:
		num_history=num_files
	
	scores=numpy.array(0)
	scores_neg=numpy.array(0)
	for i in range(num_files-num_history,num_files):
		with open(path_word_cross_likelihoods + list_of_files[i]) as f_files:
			for line in f_files:
				line=line.strip()
				line_split = line.split(',')
				diff=float(line_split[1]) - float(line_split[0])
				if diff>0:
					scores=numpy.append(scores,diff)
				else:
					scores_neg=numpy.append(scores_neg,diff)

	return scores, scores_neg

def compute_score(scores, scores_neg, likelihood_target_word, likelihood_background_model, flag_verbose):	
	scores_0_perc = numpy.percentile(scores,0)
	scores_20_perc = numpy.percentile(scores,20)
	scores_60_perc = numpy.percentile(scores,60)
	
	scores_neg_0_perc = numpy.percentile(scores_neg,0)
	scores_neg_20_perc = numpy.percentile(scores_neg,20)
	scores_neg_60_perc = numpy.percentile(scores_neg,60)
	
	if len(numpy.atleast_1d(scores))>1:
		scores_min=min(scores)
	else:
		scores_min=scores

	if len(numpy.atleast_1d(scores_neg))>1:
		scores_neg_min=min(scores_neg)
	else:
		scores_neg_min=scores_neg

	if flag_verbose >= 2:
		sys.stderr.write(str(scores_0_perc) + " " + str(scores_20_perc) + " " + str(scores_60_perc) + " " + " " + str(scores_min) + '\n')
		sys.stderr.write(str(scores_neg_0_perc) + " " + str(scores_neg_20_perc) + " " + str(scores_neg_60_perc) + " " + " " + str(scores_neg_min) + '\n')
		sys.stderr.write("difference of target and background " + str(likelihood_target_word-likelihood_background_model) + "\n")


	likelihood_diff=likelihood_target_word-likelihood_background_model
	
	if likelihood_diff > 0:
		if likelihood_diff > scores_60_perc:
			scores_out=5
		elif likelihood_diff > scores_20_perc:
			scores_out=4
		elif likelihood_diff > scores_0_perc:
			scores_out=3
	else:
    		if likelihood_diff > scores_neg_60_perc:
			scores_out=2
  		elif likelihood_diff > scores_neg_20_perc:
			scores_out=1
		else: 
			scores_out=0
	return scores_out

