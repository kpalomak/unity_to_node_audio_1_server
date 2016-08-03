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


var path_speaker = "./upload_data/from_game/foo";
var path_ada = "./upload_data/from_game/foo/ada";
var phn_out = path_ada + "_phns_out/";
var phn_in = path_ada + "_phns_in/";
var recipe_name="test.recipe"

var name_lex_in='/home/siak/models/clean-am/words_utf-8.lex'
//var name_lex_in='/home/siak/models/clean-am/words.lex'
var model_name="/home/siak/models/clean-am/siak_clean_b"
var cfg_name= "/home/siak/models/clean-am/siak_clean_b.cfg"
var speaker_id="S1";
var spk_in=path_speaker + "/" + "default.spkc"
var spk_out=path_speaker + "/" + speaker_id + "_n.spkc"
var spk_out_tmp=path_speaker + "/" + speaker_id + "_temp.spkc"
var iteration=1



function align(recipe_name,model_name,cfg_name){
	//var args = ['-i', '2', '--swins=','100000', '-b', model_name, '-c', cfg_name, '-r', recipe_name];
	//spawn('align',args)
	cmd = "align -i 2 --swins=100000 -b " + model_name + " -c " + cfg_name + " -r " + recipe_name;
	const execSync = require('child_process').execSync;
	code = execSync(cmd);
	//spawn(cmd);
};

function mllr(iteration,model_name,cfg_name,recipe_name,spk_in,spk_out){
	//var spk_out_tmp="tmp_" + spk_out;
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

function make_recipe(recipe_name,path_ada,flag_align) {
	audio_files_list=fs.readdirSync(path_ada);
	fs.writeFileSync(recipe_name,'');
	audio_files_list.forEach(function(audio_file){
  		out=parse_audio_file_name(audio_file);
		speaker=out.speaker;
		word=out.word;
		console.log(audio_file);
		console.log(out);
		console.log(word);
		if (flag_align==1) {
			recipe_line="audio=" + path_ada + '/' + audio_file + " transcript=" + phn_in + word + ".phn" + " alignment=" + phn_out + word + ".phn speaker=" + speaker_id + "\n";
			phn_name_tmp=phn_in + word + ".phn_tmp"
			phn_name=phn_in + word + ".phn"
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
        	        recipe_line="audio=" + path_ada + '/' + audio_file + " transcript=" + phn_out + word + ".phn" + " alignment=" + phn_out + word + ".rawseg speaker=" + speaker_id + "\n";
		}
		console.log(recipe_line)
		fs.appendFileSync(recipe_name,recipe_line);
	});
}



function adaptation(){
	make_recipe(recipe_name,path_ada,1);
	align(recipe_name,model_name,cfg_name)
	make_recipe(recipe_name,path_ada,0);
	mllr(iteration,model_name,cfg_name,recipe_name,spk_in,spk_out);
	debugout("kekkonen");
}

adaptation();
