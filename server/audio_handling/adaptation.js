//var eventEmitter = require('./emitters.js');

//var config=require('config');
var logging = require('../game_data_handling/logging');

var spawn = require('child_process').spawn;
//var exec = require('child_process').exec;

var feature_timeout_ms = 15000; // 15s 
var DEBUG_TEXTS = true;

var sptk_path='/usr/local/bin/';

var debug = true;

//var fs = require('fs');
var fs = require('fs-extra');


var outputbuffer = Buffer.concat([]);


var wav    = require('wav');

var speaker_id="S1"

function debugout(format, msg) {
    if (debug==true) {
        if (msg)
            console.log(format, logging.get_date_time().datetime + ' ' +msg);
        else
            console.log( '\x1b[33mserver %s\x1b[0m', logging.get_date_time().datetime  +' '+ format);
    }
}


var path_audio="../upload_data/from_game/foo/ada"
var recipe_name="test.recipe"

var name_lex_in='/home/siak/models/clean-am/words_utf-8.lex'
//var name_lex_in='/home/siak/models/clean-am/words.lex'
var model_name="/home/siak/models/clean-am/siak_clean_b"
var cfg_name= "/home/siak/models/clean-am/siak_clean_b.cfg"
var speaker_id="S1";
var spk_in="default.spkc"
var spk_out=speaker_id + "_10words.spkc"
var iteration=1

/*import time
import os
from get_model_tools import get_word_models_from_lex 

adaptation_check_interval_sec=5


flag=1

  

#name_lex_in='/home/siak/models/clean-am/words_utf-8.lex'
name_lex_out='dummy.lex'
name_word_list="/home/siak/siak/aalto_recordings/prompts/wordlist_random.txt"
adaptation_log="adaptation_log.txt"


flag_align=0
flag_recipe=1

words_in_list=143
num_utt_in_ada=5


#if flag_recipe:

def parse_audio_file_name(name_audio_file):
	name_audio_file=name_audio_file.split('_')
	#print "dbg",name_audio_file
	speaker=name_audio_file[0]
	unknown=name_audio_file[1]
	word=name_audio_file[2]
	return speaker, word

def make_recipe(recipe_name,path_audio,name_word_list,audio_files_list,speaker_id,flag_recipe_align):
	cnt=1
	f_recipe=open(recipe_name,"w")
	for audio_file in audio_files_list:
		#print audio_file
		[speaker,word]=parse_audio_file_name(audio_file)
		print speaker,word
		if flag_recipe_align==1:
			recipe_line="audio=" + path_audio + '/' + audio_file + " transcript=" + "./phns_in/" + word + ".phn" + " alignment=./phns_out/" + word + ".phn speaker=" + speaker_id + "\n"
			name_models=get_word_models_from_lex([word],name_lex_in)
			f_phn=open("./phns_in/" + word + ".phn", "w");
			f_phn.write("__\n")
			for name_model in name_models:
				f_phn.write(name_model + "\n")
			f_phn.write("__\n")
			f_phn.close()
		else:
				recipe_line="audio=" + path_audio + '/' + audio_file + " transcript=" + "./phns_out/" + word + ".phn" + " alignment=./phns_out/" + word + ".rawseg speaker=" + speaker_id + "\n"
#			if (cnt > words_in_list-utt_in_ada):		
#				print recipe_line
		print recipe_line
		f_recipe.write(recipe_line)
		cnt=cnt+1
	f_recipe.close()

#if flag_align:
def align(recipe_name,model_name,cfg_name):
	cmd = "align -i 2 --swins=100000 -b " + model_name + " -c " + cfg_name + " -r " + recipe_name

        os.system(cmd)

def adapt(iteration,model_name,cfg_name,recipe_name,spk_in,spk_out):
	spk_out_tmp="tmp_" + spk_out
	for i in range(0,iteration):
		cmd = "mllr -b " + model_name + " -c " + cfg_name + " -r " + recipe_name + " -S " + spk_in + " --out " + spk_out_tmp + " --mllr mllr -i 1"
		spk_in=spk_out_tmp
		print cmd
		os.system(cmd)
	os.rename(spk_out_tmp,spk_out) # need to have an atomic operation to ensure that file is fully written when it appears in the filesystem


		
player_audio_files_list=os.listdir(path_audio)		
num_audio_files=len(audio_files_list)
make_recipe(recipe_name,path_audio,name_word_list,player_audio_files_list,speaker_id,1)
align(recipe_name,model_name,cfg_name)
make_recipe(recipe_name,path_audio,name_word_list,player_audio_files_list,speaker_id,0)
adapt(iteration,model_name,cfg_name,recipe_name,spk_in,spk_out)*/
/*,  (err, audio_files_list) => {
  console.log(audio_files_list);
    // Prints: /tmp/foo-itXde2
});*/

function align(recipe_name,model_name,cfg_name){
	//var args = ['-i', '2', '--swins=','100000', '-b', model_name, '-c', cfg_name, '-r', recipe_name];
	//spawn('align',args)
	cmd = "align -i 2 --swins=100000 -b " + model_name + " -c " + cfg_name + " -r " + recipe_name;
	const execSync = require('child_process').execSync;
	code = execSync(cmd);
	//spawn(cmd);
};

function mllr(iteration,model_name,cfg_name,recipe_name,spk_in,spk_out){
	var spk_out_tmp="tmp_" + spk_out;
	for (i=0; i < iteration; i++) {
		cmd = "mllr -b " + model_name + " -c " + cfg_name + " -r " + recipe_name + " -S " + spk_in + " --out " + spk_out_tmp + " --mllr mllr -i 1";
		const execSync = require('child_process').execSync;
		code = execSync(cmd);
		spk_in=spk_out_tmp;
	
	}
}
	//os.rename(spk_out_tmp,spk_out) # need to have an atomic operation to ensure that file is fully written when it appears in the filesystem


function parse_audio_file_name(audio_file_name) {
	var audio_file_name_split = audio_file_name.split("_");
	//console.log(audio_file_name)
	var speaker=audio_file_name_split[0];
	var word=audio_file_name_split[2];
	return {speaker: speaker, word: word};
}

function get_word_models_from_lex(lex_name, word) {
	var lex_list=fs.readFileSync(lex_name);
	lex_list=lex_list.toString();
	lex_list=lex_list.split("\n");
	//console.log(lex_list)

	lex_list.forEach(function(lex_line) {
		//console.log(lex_line);
		lex_line_split=lex_line.split("(1.0) ");
		if (lex_line_split[0]==word) {
			model=lex_line_split[1];
			model_split=model.split(" ");
			console.log(model_split);
		}
		//console.log(lex_line_split);
		
	});
	return model_split
}

function make_recipe(recipe_name,path_audio,flag_align) {
	audio_files_list=fs.readdirSync(path_audio);
	fs.writeFileSync(recipe_name,'');
	audio_files_list.forEach(function(audio_file){
  		out=parse_audio_file_name(audio_file);
		speaker=out.speaker;
		word=out.word;
		console.log(word);
		if (flag_align==1) {
			recipe_line="audio=" + path_audio + '/' + audio_file + " transcript=" + "./phns_in/" + word + ".phn" + " alignment=./phns_out/" + word + ".phn speaker=" + speaker_id + "\n";
			phn_name_tmp="./phns_in/" + word + ".phn_tmp"
			phn_name="./phns_in/" + word + ".phn"
			fs.writeFileSync(phn_name_tmp, "__\n");
			models=get_word_models_from_lex(name_lex_in,word);
			models.forEach(function(model) {
				fs.appendFileSync(phn_name_tmp,model + "\n") ;
			});
			//for name_model in name_models:
			//	f_phn.write(name_model + "\n")
			fs.appendFileSync(phn_name_tmp,"__\n")
			cmd = "iconv -f utf-8 -t ISO-8859-15 " + phn_name_tmp + " > " + phn_name + "; rm " + phn_name_tmp;
			console.log(cmd);
			const execSync = require('child_process').execSync;
			code = execSync(cmd);
		}
		else {
        	        recipe_line="audio=" + path_audio + '/' + audio_file + " transcript=" + "./phns_out/" + word + ".phn" + " alignment=./phns_out/" + word + ".rawseg speaker=" + speaker_id + "\n";
		}
		console.log(recipe_line)
		fs.appendFileSync(recipe_name,recipe_line);
	});
}


make_recipe(recipe_name,path_audio,1);
align(recipe_name,model_name,cfg_name)
make_recipe(recipe_name,path_audio,0);
mllr(iteration,model_name,cfg_name,recipe_name,spk_in,spk_out);
debugout("kekkonen");

