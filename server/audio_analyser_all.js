

if (process.env.NODE_ENV !== 'production'){
    print_debug('Requiring longjohn:');
    longjohn = require('longjohn');

    longjohn.async_trace_limit = 25;   // defaults to 10
}


//var eventEmitter = require('./emitters.js');

//var config=require('config');
var spawn = require('child_process').spawn;
//var exec = require('child_process').exec;

var feature_timeout_ms = 15000; // 15s 
var DEBUG_TEXTS = false;

var sptk_path='/usr/local/bin/';

var debug = true;

var fs = require('fs');

if (debug) {
    var fs = require('fs');
}

var outputbuffer = Buffer.concat([]);


function compute_features(audioconf, inputbuffer, targetbuffer, user, word_id, packetcode, maxpoint) {

    //DEBUG_TEXTS = audioconf.debug_f0;

    print_debug("== EXCITING!!! user: "+user+" word_id: "+word_id+" packetcode: "+ packetcode +" maxpoint: " +maxpoint +"======");

    //var frame_step_samples = audioconf.frame_step_samples;
    //var lsforder = audioconf.lsforder;
    //var lsflength = audioconf.lsflength; // Should be order +1
    //var mfccorder = audioconf.mceporder;
    //var mfcclength = audioconf.mceplength;  // Should be order +1
    //var lsf_start = 1;
    //var mfcc_start = lsflength+1;
    //var features_length = mfcclength+lsflength+1;

    var tmpdir = "/dev/shm/siak-"+process.pid+"-"+user+"_"+word_id+"_"+packetcode+"_"+Date.now();

    fs.mkdirSync(tmpdir);

    var tmpinput = tmpdir+"/feature_input";
    var tmpoutput = tmpdir+"/feature_output";
	
    fs.writeFile(tmpinput, inputbuffer, function(err) {
	if(err) {
            show_error(err, "writefile "+tmpinput);
	}
	else {
	    
	    print_debug("Starting the shell script now:");
	    
	    var featext_command = "./analysis_scripts/audio_analyser_all.sh";
	    var featext_args = [tmpinput, tmpoutput];
	    
	    var featext = spawn(featext_command, featext_args);
	    
	    featext.stderr.on('data',  function(err)  { show_error(err.toString(), 'feat stderr'); 
							process.emit('user_event', user, word_id, 'featDone', {packetcode:packetcode, maxpoint:0}); });
	    
	    featext.on('error',  function(err)  { show_error(err, 'Feat on error'); });
	    
	    featext.on('uncaughtException', function(err) { show_error(err, 'Feat on uncaughtexp');});
	    
	    featext.on('close',  function(exit_code)  { 
		print_debug("Shell script exit: "+exit_code.toString());
		if (exit_code == 0) {
		    
		    fs.readFile(tmpoutput, function (err, outputbuffer) {
			if (err) throw err;
			
			console.log("From outputbuffer to targetbuffer: 0,"+outputbuffer.length)

			outputbuffer.copy(targetbuffer, 0, 0, outputbuffer.length);

			print_debug('Feature analysis done; Data length: '+outputbuffer.length);	   
			
			print_debug('Emitting featDone');
			process.emit('user_event', user, word_id, 'featDone', {packetcode:packetcode, maxpoint:maxpoint}); 			
			
			
		   	fs.writeFile("upload_data/debug/"+user+"_inputdata_"+packetcode, inputbuffer, function(err) {
			    if(err) {
				show_error(err);
			    }	    
			    fs.writeFile("upload_data/debug/"+user+"_outputdata_"+packetcode, outputbuffer, function(err) {
				if(err) {
				    show_error(err);
				}  
				fs.unlink(tmpinput);
				fs.unlink(tmpoutput);
				fs.rmdir(tmpdir);
			    });
			});
			
		    });
		}
		show_exit(exit_code, 'feat'); 
	    });
	}
    });
}



function show_error(err, source) {
    print_debug("=SPTK ERR== Error from "+source);
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
	console.log("=SPTK DBG== "+text);
    }
}



module.exports = { compute_features : compute_features };
