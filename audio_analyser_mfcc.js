

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

function compute_mfcc(audioconf, inputbuffer, targetbuffer, user, packetcode) {

    print_debug("============  MFCC COMPUTATION, HOW EXCITING!!! ==========");

    var frame_step_samples = audioconf.frame_step_samples;
    
    var lsforder = audioconf.lsforder;
    var lsflength = audioconf.lsflength; // Should be order +1
    
    var mfccorder = audioconf.mceporder;
    var mfcclength = audioconf.mceplength;  // Should be order +1
    

    var lsf_start = 1;
    var mfcc_start = lsflength+1;

    var features_length = mfcclength+lsflength+1;


    var mfcc_command = "./analysis_scripts/audio_analyser_mfcc.sh";
    var mfcc_args = [];

    var mfcc = spawn(mfcc_command, mfcc_args);
    
    mfcc.stderr.on('data',  function(err)  { show_error(err.toString(), 'mfcc stderr'); });

    mfcc.on('error',  function(err)  { show_error(err, 'mfcc on error'); });
    
    mfcc.on('uncaughtException', function(err) { show_error(err, 'mfcc on uncaughtexp');});
    
    mfcc.on('exit',  function(exit_code)  { 
	if (exit_code == 0) {
	    // Write to designated outputbuffer
	    print_debug('mfcc analysis done; Data length: '+outputbuffer.length);
	    
	    var mfccm = mfcc_start*4;
	    for (var mfccn=0; mfccn<outputbuffer.length; mfccn+=4) {
		outputbuffer.copy(targetbuffer, mfccm, mfccn, mfccn+mfcclength*4);
		mfccm += features_length*4;
	    }
	    if (debug) {
		fs.writeFileSync('upload_data/debug/mfcc_feature', outputbuffer);
	    }	    
	    print_debug('Emitting mfccDone');
	    process.emit('mfccDone', user, packetcode);
	}	
	show_exit(exit_code, 'mfcc'); 
    });
    

    mfcc.stdout.on('data', function(data) {
	outputbuffer = Buffer.concat([outputbuffer, data]);	
    });



    
    mfcc.stdin.write(inputbuffer, function(err){if (!err) { print_debug("writing to frame finished"); mfcc.stdin.end() } });


    

}



function show_error(err, source) {
    print_debug("=MFCC==== Error from "+source);
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
	console.log("=MFCC==== "+text);
    }
}



module.exports = { compute_mfcc : compute_mfcc };
