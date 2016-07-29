

if (process.env.NODE_ENV !== 'production'){
    print_debug('Requiring longjohn:');
    longjohn = require('longjohn');

    longjohn.async_trace_limit = 25;   // defaults to 10
}

var logging = require('../game_data_handling/logging.js');

//var eventEmitter = require('./emitters.js');

//var config=require('config');
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



//function compute_features(audioconf, inputbuffer, targetbuffer, user, word_id, packetcode, maxpoint) {

function align_with_shell_script(conf, inputbuffer, word_reference, user, word_id) {

    //DEBUG_TEXTS = audioconf.debug_f0;

    print_debug("== EXCITING!!! user: "+user+" reference: "+word_reference+ " word_id: "+word_id);

    //var frame_step_samples = audioconf.frame_step_samples;
    //var lsforder = audioconf.lsforder;
    //var lsflength = audioconf.lsflength; // Should be order +1
    //var mfccorder = audioconf.mceporder;
    //var mfcclength = audioconf.mceplength;  // Should be order +1
    //var lsf_start = 1;
    //var mfcc_start = lsflength+1;
    //var features_length = mfcclength+lsflength+1;

    var tmpdir = "/dev/shm/siak-"+process.pid+"-"+user+"_"+word_id+"_"+Date.now();

    fs.mkdirSync(tmpdir);

    var wavinput = tmpdir+"/feature_input";
    var labelinput = tmpdir+"/label_input";
    var recipeinput = tmpdir+"/recipe_input";
    var segmentoutput = tmpdir+"/segment_output";


    // 1. Write the float data into mem file system as 16bit PCM:


    var pcmindex = 0;
    var okcount = 0;
    var notokcount = 0;
    
    print_debug("Writing "+inputbuffer.length + " bytes of float data into integer buffer");

    pcmbuffer = new Buffer(inputbuffer.length/2);

    for (var i = 0; i < inputbuffer.length; i+=4) {
	try {
	    pcmbuffer.writeInt16LE( inputbuffer.readFloatLE(i) * 32767 , pcmindex );
	    pcmindex+=2;
	    if (debug) okcount++;
	}
	catch (err) {	    
	    pcmindex+=2;
	    print_debug(err.toString());
	    if (debug) notokcount++;
	}
    }
    
    print_debug(okcount + " values written, "+ notokcount +" values NOT written");


    var writer = new wav.FileWriter(wavinput, { sampleRate: conf.audioconf.fs , channels: 1});
    writer.write(pcmbuffer);    
    writer.end();

    // Make a copy of the wav file (async to save time):
    // #cp $3 "/l/data/siak-server-devel/server/upload_data/from_game/${1}_`date +"%Y-%m-%d-%H-%M-%S"`.wav"    
    var target_wavfile = 'upload_data/from_game/'+user +'_'+ word_id +'_'+ word_reference  +'_'+ logging.get_date_time().datetime_for_file + ".wav" ;
    print_debug("target_wavfile :" + target_wavfile );
    print_debug("wavinput :" + wavinput );

    fs.copy(wavinput, target_wavfile, function(err) {if (err) { logging.log_error( {user: user, 
										    event: "save_wav", 
										    word: word_reference,
										    target: target_wavfile,
										    error: err.toString() } ) } });
    // 2. write the labels in to mem file system:
    
    // (This will be done by the script itself)

    // 3. write the recipe file into mem file system:

    // (This will be done by the script itself)


    var lexicon = conf.recogconf.lexicon;
    var model = conf.recogconf.model
    
    var featext_command = "./audio_handling/shell_script_aligner.sh";
    var featext_args = [ word_reference, lexicon, wavinput, labelinput, model, segmentoutput ];

    var comm = featext_command;
    featext_args.forEach(function(arg){ comm += " "+arg });

    print_debug("Starting the shell script now: "+comm);
    
    var featext = spawn(featext_command, featext_args);
    
    featext.stderr.on('data',  function(data)  { print_debug(data); 
						//process.emit('user_event', user, word_id, 'segmented',{word:word_reference} ) 
					      } );
    
    featext.on('error',  function(err)  { show_error(err, 'Feat on error'); });
    
    featext.on('uncaughtException', function(err) { show_error(err, 'Feat on uncaughtexp');});
    
    featext.on('close',  function(exit_code)  { 
	print_debug("Shell script exit: "+exit_code.toString());
	if (exit_code == 0) {
	    
	    fs.readFile(segmentoutput, function (err, segmentation) {
		if (err) throw err;
		
		print_debug('Segmentation done: '+ segmentation);	   
		
		process.emit('user_event', user, word_id, 'segmented',{word:word_reference, segmentation:segmentation}); 			
		
		fs.unlink(wavinput);
		fs.unlink(labelinput);

		fs.unlink(segmentoutput);
		fs.rmdir(tmpdir);

		// We don't use the recipe input, though I guess we could.
		//fs.unlink(recipeinput);

	    });
	}
	show_exit(exit_code, 'feat'); 
    });
}



function show_error(err, source) {
    print_debug("=ALIGN ERR== Error from "+source);
    print_debug(err);
}



function show_exit(exit_code, source) {
    if (DEBUG_TEXTS) {
	if (exit_code==0) 
	{
	    print_debug(source + " exited with code "+exit_code);
	}
	else 
	{
	    print_debug(source + " exited with code "+exit_code);
	}
    }
}


function print_debug(text) {
    if (DEBUG_TEXTS) 
    {
	var cyan="\x1b[36m";
	var bright=  "\x1b[1m" ;
	console.log(cyan + bright + "aligne " + logging.get_date_time().datetime + " " + text);
    }
}



module.exports = { align_with_shell_script: align_with_shell_script };
