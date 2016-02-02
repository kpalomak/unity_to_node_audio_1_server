

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
var DEBUG_TEXTS = true;

var sptk_path='/usr/local/bin/';

var debug = true;

if (debug) {
    var fs = require('fs');
}

var outputbuffer = Buffer.concat([]);


function compute_f0(audioconf, inputbuffer, targetbuffer, user, packetcode) {

    print_debug("============   LSF COMPUTATION, HOW EXCITING!!! ==========");

    var frame_step_samples = audioconf.frame_step_samples;
    
    var lsforder = audioconf.lsforder;
    var lsflength = audioconf.lsflength; // Should be order +1
    
    var mfccorder = audioconf.mceporder;
    var mfcclength = audioconf.mceplength;  // Should be order +1
    

    var lsf_start = 1;
    var mfcc_start = lsflength+1;

    var features_length = mfcclength+lsflength+1;


    var f0_command = "./analysis_scripts/audio_analyser_f0.sh";
    var f0_args = [];

    var f0 = spawn(f0_command, f0_args);
    
    f0.stderr.on('data',  function(err)  { show_error(err.toString(), 'f0 stderr'); 
					    process.emit('f0Done', user, packetcode); });

    f0.on('error',  function(err)  { show_error(err, 'f0 on error'); });
    
    f0.on('uncaughtException', function(err) { show_error(err, 'f0 on uncaughtexp');});
    
    f0.on('exit',  function(exit_code)  { 
	if (exit_code == 0) {
	    print_debug('f0 analysis done; Data length: '+outputbuffer.length);	   
	    
	    var m = 0;
	    for (var n=0; n<outputbuffer.length; n+=4) {
		outputbuffer.copy(targetbuffer, m, n, n+4);
	    }	    
	    
	    print_debug('Emitting logF0Done');
	    process.emit('logF0Done', user, packetcode);
	}
	show_exit(exit_code, 'f0'); 
    });





    f0.stdout.on('data', function(data) {
	outputbuffer = Buffer.concat([outputbuffer, data]);	
    });
    
    f0.stdin.write(inputbuffer, function(err){if (!err) { print_debug("writing to frame finished"); f0.stdin.end() } });


    

}



function show_error(err, source) {
    print_debug("=F0== Error from "+source);
    print_debug(err);
}



function show_exit(exit_code, source) {
    if (exit_code==0) 
    {
	print_debug(source + " exited with code "+exit_code);
    }
    else 
    {
	print_debug(source + " exited with code "+exit_code);
    }
}


function print_debug(text) {
    if (DEBUG_TEXTS) 
    {
	console.log("=F0== "+text);
    }
}



module.exports = { compute_f0 : compute_f0 };
