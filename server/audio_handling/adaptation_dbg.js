// SIAK adaptation script by Kalle Palomäki 2016
// I too a "header" from other scripts to get things like debugout working
// script works so that it scans through a directory where wavs for
// adaptation are stored, organizes the files according date
// then uses the "num_words_used_for_adaptation" newest of them in adaptation
// NOTE!! A slightly silly issue here is that the over head in running align
// The scoring part of server runs align every time an audio file is recived
// and then this scripts runs it again. More efficient way would be to store
// alignments at the first run, and then it is not needed here. I have just made
// a simple implementation here to show it works, but probably you'll
// want to fix this.

var logging = require('../game_data_handling/logging');
var num_words_used_for_adaptation = 100;
var spawn = require('child_process').spawn;
var feature_timeout_ms = 15000; // 15s 
var DEBUG_TEXTS = true;

var sptk_path='/usr/local/bin/';
var debug = true;
var fs = require('fs-extra');

var outputbuffer = Buffer.concat([]);

var wav    = require('wav');

var speaker_id="S"

function debugout(format, msg) {
    if (debug==true) {
        if (msg)
            console.log(format, logging.get_date_time().datetime + ' ' +msg);
        else
            console.log( '\x1b[33mserver %s\x1b[0m', logging.get_date_time().datetime  +' '+ format);
    }
}

console.log("show args");

// setting arguments, and stuff derived from arguments
var path_speaker=process.argv[2];
console.log("path_speaker: " + path_speaker);

var path_ada = path_speaker + "/ada";
var phn_out = path_ada + "_phns_out/";
var phn_in = path_ada + "_phns_in/";
var name_lex_in=process.argv[3];
console.log("name_lex_in: " + name_lex_in);

if (!fs.existsSync(path_ada)){
    fs.mkdirSync(path_ada);
}

if (!fs.existsSync(phn_in)){
    fs.mkdirSync(phn_in);
}

if (!fs.existsSync(phn_out)){
    fs.mkdirSync(phn_out);
}

var recipe_name=path_speaker + "/test.recipe"




var name_lex_utf=path_speaker + "/lex_utf.lex";
var model_name=process.argv[4];
debugout("I didn't find cfg in configs, I hope I got it right");
var cfg_name= model_name + ".cfg" 
var spk_out=process.argv[5];
var spk_in=spk_out + "_in.spkc";


cmd = "cp audio_handling/default.spkc " + spk_in;
const execSync = require('child_process').execSync;
	code = execSync(cmd);

var spk_out_tmp = spk_out + "_tmp.spkc"
var spk_out=spk_out + ".spkc"; 
var iteration=1

debugout("speaker out");
debugout(spk_out);

function align(recipe_name,model_name,cfg_name){
	// js - align wrapper
	cmd = "align -i 2 --swins=100000 -b " + model_name + " -c " + cfg_name + " -r " + recipe_name;
	console.log(cmd)
	const execSync = require('child_process').execSync;
	code = execSync(cmd);
};

function mllr(iteration,model_name,cfg_name,recipe_name,spk_in,spk_out){
	// js - mllr wrapper
	for (i=0; i < iteration; i++) {
		cmd = "mllr -b " + model_name + " -c " + cfg_name + " -r " + recipe_name + " -S " + spk_in + " --out " + spk_out_tmp + " --mllr mllr -i 1";
		const execSync = require('child_process').execSync;
		code = execSync(cmd);
		spk_in=spk_out_tmp;
	
	}
	fs.renameSync(spk_out_tmp,spk_out);
}

function parse_audio_file_name(audio_file_name) {
	var audio_file_name_split = audio_file_name.split("_");
	var speaker=audio_file_name_split[0];
	var word=audio_file_name_split[2];
	return {speaker: speaker, word: word};
}

function get_word_models_from_lex(lex_name, lex_utf, word) {
	// takes in the "lex_name", scans to the line specified through "word"
	// takes the hmm-specification on that line, and returns the hmm-models
	// as string
	cmd = "iconv -f ISO8859-15 -t utf-8 " + lex_name + " > " + lex_utf;
	const execSync = require('child_process').execSync;
	code = execSync(cmd);
 	var lex_list=fs.readFileSync(lex_utf);
	lex_list=lex_list.toString();
	lex_list=lex_list.split("\n");

	lex_list.forEach(function(lex_line) {
		lex_line_split=lex_line.split("(1.0) ");
		if (lex_line_split[0]==word) {
			model=lex_line_split[1];
			model_split=model.split(" ");
			console.log(model_split);
		}
		
	});
	return model_split
}

function make_recipe(recipe_name,path_ada,flag_align,num_words_used_for_adaptation) {
	// produces two recipes, one for aligning, and the other for adaptation
	audio_files_list=fs.readdirSync(path_ada);
	// sort files in order of time, which is to use adaptation only for the newest files
	audio_files_list.sort(function(a, b) {
               return fs.statSync(path_ada + '/' + a).mtime.getTime() - 
                      fs.statSync(path_ada + '/' + b).mtime.getTime();
           });
	audio_files_list=audio_files_list.slice(1,num_words_used_for_adaptation);
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
			models=get_word_models_from_lex(name_lex_in, name_lex_utf,word);
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



function adaptation(recipe_name, path_ada, num_words_used_for_adaptation, cfg_name, spk_out, spk_in){
	make_recipe(recipe_name,path_ada,1,num_words_used_for_adaptation);
	align(recipe_name,model_name,cfg_name)
	make_recipe(recipe_name,path_ada,0,num_words_used_for_adaptation);
	mllr(iteration,model_name,cfg_name,recipe_name,spk_in,spk_out);
	debugout("kekkonen");
}

adaptation(recipe_name, path_ada, num_words_used_for_adaptation, cfg_name, spk_out, spk_in);
