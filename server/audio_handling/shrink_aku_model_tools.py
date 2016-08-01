import re 

# reads target words from a list, searches them from lexicon file and extracts the corresponding phonemes
def get_word_models_from_lex(Target_words,name_lex_out,name_lex_in):
	# Input parameters: 
	# Target_words : list of target words
	# name_lex_out : output lexicon file name where to write selected word models, which are those in the Target_words
	# name_lex_in : input lexicon file name from where to search target words
	# Output:
	# name_word_models_no_duplicates: word models as a list with duplicates removed
	name_list_of_word_models=[]
	f_lex_out=open(name_lex_out,'w')
	f_lex_out.write('<s>(1.0)\n</s>(1.0)\n')
	
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
					f_lex_out.write(f_line)		
					name_list_of_word_models_temp=name_word_models.split(' ')
					for name_word_models in name_list_of_word_models_temp:
						name_list_of_word_models.append(name_word_models)
	f_lex.close()
	f_lex_out.close()
	name_word_models_no_duplicates=[]

	# one word model can be many times in a list and needs to be removed
	for name_word_model in name_list_of_word_models:
		cnt_dup=0
		for name_word_model_dup in name_list_of_word_models:
			if name_word_model_dup==name_word_model:
				cnt_dup=cnt_dup+1
		if cnt_dup<2:				
			name_word_models_no_duplicates.append(name_word_model)
	print len(name_word_models_no_duplicates),len(name_list_of_word_models)

	return name_word_models_no_duplicates

###############

# reads hmms from the ph-files in a list item corresponding to each HMM
def read_hmms_from_ph(name_list_of_word_models,name_ph):
	# Input parameters:
	# name_list_of_word_models: word models as a list
	# name_ph : name of ph-file as a string
	# Output:
	# HMM : hmms as list items
	phone=[];
	state=[];
	hmm_idx=0;
	HMM=[];
	cnt_triphone=0
	for name_triphone in name_list_of_word_models:
		hmm=[];

		with open(name_ph,'r') as f_ph:
			for f_line in f_ph:
				match_str=' '+name_triphone+'\n'
				if match_str in f_line:
					items=f_line.split(' ')
					nu_states=int(items[1])
					hmm_idx=hmm_idx+1;
					hmm_idx_str=str(hmm_idx)
					next_line=f_line
					line_cnt=0
					for next_line2 in f_ph: #line_cnt in range(1,nu_states+3):
						hmm.append(next_line)
						next_line=next_line2
						if line_cnt >= nu_states+1:
							break
						line_cnt=line_cnt+1
		HMM.append(hmm);
	return HMM



#############

# Class of storing various clusters - related information
# - mapping of old cluster index to new

class Clusters:
	def __init__(self, _old, _new):
		self.old=_old
		self.new=_new


################

# Class for storing gaussians - related information
# - mapping of old gaussina index to new
# - gaussian kernels as list
# - gaussian weights
# - latter two are set in the functions that manipulate the class
class Gaussian:
	def __init__(self, _old, _new):
		self.old=_old
		self.new=_new

#############

# reads the mc file and stores it to states- related data structure
# Following operations additions to the state object are made
# 			- reading and addition of the old state index to the object
# 			- reading and addition of the old gaussian index to the object, which is not used 
#			  as there is a separate class for gaussian
#			- reading and addition number of gaussians per state to the object

def read_mc(name_mc,states_mapped):
	# Input parameters:
	# name_mc : name of mc-file as a string
	# states_mapped :  state-object to store states related information
	#
	# Output: 
	# states_mapped : state-object with added information
	# num_gauss_cumu : total number of gaussians in the whole set of HMMs
	
	state_idx_old=0
	num_gauss_per_state=0
	num_gauss_cumu=0
	mc_vec=[]
	
	# read mc file to a temporary vector
	with open(name_mc,'r') as f_mc:
		state_count_old=f_mc.next() 
		for line in f_mc:
			mc_vec.append(line)
		
	f_mc.close()
	
	# go through each state and associate parameters in the mc-file to the state objects
	for state in states_mapped:
		line=mc_vec[state.old]
		line_split=line.split(' ')
		num_gauss_per_state=int(line_split[0])
		# add number of gaussian parameter in the mc to the state object
		states_mapped[state.new].num_gauss_per_state=num_gauss_per_state
	 	# initialize gaussian wieght and index vectors
		states_mapped[state.new].gaussian_weight=[]
		states_mapped[state.new].gaussian_idx_old=[]
		flag_mc=0
		# add weights and indeces to the state object, they appear in alternate 
		# rows in the mc which is treated in the loop 
		for cnt_mc in range(1,len(line_split)):
			if flag_mc:
				states_mapped[state.new].gaussian_weight.append(float(line_split[cnt_mc]))
				flag_mc=0
			else:
				flag_mc=1
				states_mapped[state.new].gaussian_idx_old.append(int(line_split[cnt_mc]))
		num_gauss_cumu=num_gauss_cumu+num_gauss_per_state


	return states_mapped, num_gauss_cumu

################

# read in of the .gcl cluster file which is currently not used and not properly debugged
def read_gcl(name_gcl,states_mapped):
	cluster_idx_old_vec=[]
	gauss_idx_new=0
	print "FUNCTION NOT TESTED BE CAREFUL!"
	for state in states_mapped:
		states_mapped[state.new].gauss_idx_old=[]
		states_mapped[state.new].gauss_idx_new=[]
		states_mapped[state.new].cluster_idx_old=[]
		with open(name_gcl,'r') as f_gcl:
			for line in f_gcl:
					for gauss_idx_old in range(state.first_gaussian_idx_old,state.last_gaussian_idx_old):
						matsi=re.match(r'\d*',line,re.M|re.I)
						if gauss_idx_old==int(matsi.group(0)):
							cluster_idx_old=re.sub('\d* ','',line)
							cluster_idx_old.strip()	
							states_mapped[state.new].cluster_idx_old.append(int(cluster_idx_old))
							cluster_idx_old_vec.append(int(cluster_idx_old))
							gauss_idx_new=gauss_idx_new+1	
		f_gcl.close()
	return states_mapped, cluster_idx_old_vec

def find_clusters_mapping(cluster_idx_vec_old):
	cluster_idx_vec_old=list(set(cluster_idx_vec_old))
        cluster_idx_vec_old.sort(key=int)
	cluster_idx_new=0;
	cluster=[]
	#print cluster_idx_vec
	for cluster_idx_old in cluster_idx_vec_old:
		cluster.append(Clusters(cluster_idx_old,cluster_idx_new))
		cluster_idx_new=cluster_idx_new+1;
	cluster_idx_max=cluster_idx_new
	return cluster,cluster_idx_max

# class for storing HMM-related information
# 	- mapping of old hmm to new

class HMMs:
	def __init__(self,_old,_new):
		self.old=_old
		self.new=_new

def find_HMMs_mapping(HMM_list):
	# Input paramters
	# HMM_list : HMMs in a for where each HMM is a list item consisting of strings
	# Output parameters:
	# HMM_mapping : is and object that stores
	#    - mapping of HMM indices from old to new, this function does the mapping
	#    - stores rows of HMMs as strings
	# HMM_count : total number of HMMs in the acoustic model
	HMM_idx_vec_old=[]

	# reads hmm indices from the HMM_list and makes them int type
	for hmm in HMM_list:
		matchObj=re.match(r'\d*',hmm[0],re.M|re.I)
		HMM_idx_vec_old.append(int(matchObj.group(0)))

	# confirms that the old indices are in ascending order
	HMM_idx_vec_old.sort(key=int)
	HMM_idx_new=0
	HMM_mapping=[]
	# as the old indices are in ascelding order the new indices are added from one 
	# to the length of vector
	for hmm_idx_old in HMM_idx_vec_old:
		HMM_mapping.append(HMMs(hmm_idx_old,HMM_idx_new))
		for hmm in HMM_list:
			if str(hmm_idx_old) in hmm[0]:		
				HMM_mapping[HMM_idx_new].HMM_list=hmm
		HMM_idx_new=HMM_idx_new+1
	
	HMM_count=HMM_idx_new
	return HMM_mapping, HMM_count

def replace_HMM_indices(mapping):
	# Input parameters: 
	# mapping is the HMM object :
	#      - mapping of hmm indices from old to new
	#
	#  This function replaces old HMM indices with new ones
	#
	#  Output is the new HMM with new HMM indices

	HMM_out=[]

	for mapi in mapping:
		if str(mapi.old) in mapi.HMM_list[0]:
			mapping[mapi.new].HMM_list[0]=re.sub(r'\d*',str(mapi.new),mapi.HMM_list[0],1)
			
	return mapping

def write_phn(HMM,name_phn,HMM_count):
	# Input parameters:
	# HMM - HMM object including everything needed
	# name_phn - name of the phn file to be written
	# HMM_count - number of HMMs in the whole model
	f_phn=open(name_phn,'w')
	f_phn.write('PHONE\n')
	f_phn.write(str(HMM_count) + '\n')
	for hmm in HMM:	
		for line in hmm.HMM_list:
			f_phn.write(line)

	f_phn.close()


def write_mc(States,name_mc):
	# Input parameters
	# States - states object for storing information organized based on the state index
	# name_mc - file to write the new mc-file
	f_mc=open(name_mc,'w')
	f_mc.write(str(len(States))+'\n')
	for state in States:
		mc_line=[]
		cnt_loop=0
		f_mc.write(str(state.num_gauss_per_state))
		f_mc.write(' ')
		for gaussian_idx_new in state.gaussian_idx_new:
			gaussian_weight_str=str(state.gaussian_weight[cnt_loop])
			f_mc.write(str(gaussian_idx_new))
			line_to_write=str(gaussian_idx_new)+ ' ' + gaussian_weight_str
			f_mc.write(' ')
			f_mc.write(gaussian_weight_str)
			f_mc.write(' ')
			cnt_loop=cnt_loop+1
			a=0
		f_mc.write('\n')
	f_mc.close()

def read_gk_to_states(states_mapped,name_gk):
	gauss_idx_new=0
	cluster_idx_vec=[]
	cnt_list=0;
	gk_as_list=[]
	with open(name_gk,'r') as f_gk:
		for line in f_gk:
			if cnt_list>=1:
				gk_as_list.append(line)		
			cnt_list=cnt_list+1
	f_gk.close()
	for state in states_mapped:
		#states_mapped[state.new].gauss_idx=[]
		#states_mapped[state.new].cluster_idx=[]
		states_mapped[state.new].gauss_kern=[]
	        gauss_idx_old=0
		#print 'lega', len(gk_as_list)
		cnt_loop=0
		for gaussian_idx_new in state.gaussian_idx_new:
			states_mapped[state.new].gauss_kern.append(gk_as_list[states_mapped[state.new].gaussian_idx_old[cnt_loop]])
			#print 'dbg gk',state.new,gaussian_idx_new, states_mapped[state.new].gaussian_idx_old[cnt_loop],states_mapped[state.new].gaussian_idx_new[cnt_loop]
			dbg_ve=[]
			cnt_loop=cnt_loop+1
		
	return states_mapped

def read_gk(gaussians_mapped,name_gk):

	gauss_idx_new=0
	cluster_idx_vec=[]
	cnt_list=0;
	gk_as_list=[]
	with open(name_gk,'r') as f_gk:
		for line in f_gk:
			if cnt_list>=1:
				gk_as_list.append(line)		
			cnt_list=cnt_list+1
	f_gk.close()
        #gaussians_mapped.gauss_kern=[]
	for gaussian in gaussians_mapped:
		#states_mapped[state.new].gauss_idx=[]
		#states_mapped[state.new].cluster_idx=[]
		gaussian.gauss_kern=gk_as_list[gaussian.old]
		gaussians_mapped[gaussian.new]=gaussian
	        gauss_idx_old=0
		#print 'lega', len(gk_as_list)
		cnt_loop=0
		
	return gaussians_mapped

def write_gk(states_mapped,name_gk,gaussian_count,gaussians_mapped):
	f_gk=open(name_gk,'w')
	f_gk.write(str(gaussian_count) + ' 39 variable\n')
	gaussian_idx_vec=[]
	for gaussian in gaussians_mapped:
			f_gk.write(gaussian.gauss_kern)
	f_gk.close()


def write_gcl(states_mapped,name_gcl,state_count):
	f_gcl=open(name_gcl,'w')
	f_gcl.write(str(int(state_count)+2) + '\n')
	for state in states_mapped:
		cluster_cnt=0
		#print 'write_gcl',state.gauss_idx_new,state.gauss_idx_old
		for gauss_idx_new in state.gauss_idx_new:
			#print state.new,len(state.gauss_idx_new),len(state.cluster_idx_new), len(state.cluster_idx_old),gauss_idx_new,state.cluster_idx_new[cluster_cnt]
			#print  state.cluster_idx_new #[gauss_idx_new]
			f_gcl.write(str(gauss_idx_new) + ' ' + str(state.cluster_idx_new[cluster_cnt]) + '\n')			
			#a=0
			cluster_cnt=cluster_cnt+1
	f_gcl.close()


def cluster_idx_to_states_obj(clusters,states):
	for state in states:
		#print state.gauss_idx_old
		#print state.gauss_idx_new
		states[state.new].cluster_idx_new=[]
		for cluster_idx_old in state.cluster_idx_old:
			#print "clusters",clusters.old
			for cluster in clusters:
				#print 'cluster idx to states',cluster.old, cluster_idx_old
				if cluster.old==cluster_idx_old:
					#print "in if"
					states[state.new].cluster_idx_new.append(cluster.new)
					#print 'cluster idx to states',cluster.old,cluster.new,cluster_idx_old
	return states

def read_dur(name_dur,states_mapped):
	state_idx_old=0
	#print "in read_dur",name_dur,states_mapped
	first_gaussian_idx_old=0
	first_gaussian_idx_new=0
	num_gauss_per_state=0
	num_gauss_cumu=0
	state_count_new=0
	with open(name_dur,'r') as f_dur:
		dummy=f_dur.next()
 		state_count_old=f_dur.next()
		for line in f_dur:
			matchObj=re.match(r'\d*',line,re.M|re.I)
			first_gaussian_idx_old=first_gaussian_idx_old+num_gauss_per_state
			num_gauss_per_state=int(matchObj.group(0))
			#print matchObj.group(0)

			for state in states_mapped:
				if state_idx_old==state.old:
					first_gaussian_idx_new=first_gaussian_idx_new+num_gauss_per_state
					dur_line=line
					dur_line=re.sub(str(state_idx_old),str(state.new),line)	
					states_mapped[state.new].dur_line=dur_line
					num_gauss_cumu=num_gauss_cumu+num_gauss_per_state
					state_count_new=state_count_new+1
			state_idx_old=state_idx_old+1

	f_dur.close()	
	return states_mapped

def write_dur(States,name_dur):
	f_dur=open(name_dur,'w')
	#print len(States)
	f_dur.write('4\n'+str(len(States))+'\n')
	for state in States:
		#print "write_mc",state.old,state.num_gauss_per_state
		#print state.mc_line
		f_dur.write(state.dur_line)
		a=0
	f_dur.close()

list_word_models=[]

#for target_word in Target_words:

def find_gaussian_mapping(states_mapped):
	gaussian_idx_old_vec=[]
	for state in states_mapped:
		for gaussian_idx_old in state.gaussian_idx_old:
			gaussian_idx_old_vec.append(gaussian_idx_old)
	
	gaussian_idx_old_vec.sort(key=int)
	gaussian=[]
	#print cluster_idx_vec
	gaussian_idx_new=0
	for gaussian_idx_old in gaussian_idx_old_vec:
		gaussian.append(Gaussian(gaussian_idx_old,gaussian_idx_new))
		gaussian_idx_new=gaussian_idx_new+1;

	dbg_ve=[]
	#print 'dbg',gaussian_idx_old_vec
	gaussian_idx_new=0
	for state in states_mapped:
		states_mapped[state.new].gaussian_idx_new=[]
		gaussian_idx_new=0
		for gaussian_idx_old_in_vec in gaussian_idx_old_vec:
			for gaussian_idx_old_in_state in state.gaussian_idx_old:
				if gaussian_idx_old_in_state==gaussian_idx_old_in_vec:
					states_mapped[state.new].gaussian_idx_new.append(gaussian_idx_new)
					dbg_ve.append(gaussian_idx_new)
			gaussian_idx_new=gaussian_idx_new+1
	#print dbg_v
	return states_mapped,gaussian
