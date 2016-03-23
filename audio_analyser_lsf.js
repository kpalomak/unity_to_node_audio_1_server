

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

if (debug) {
    var fs = require('fs');
}

var outputbuffer = Buffer.concat([]);


function compute_lsf(audioconf, inputbuffer, targetbuffer, user, packetcode) {

    print_debug("============   LSF COMPUTATION, HOW EXCITING!!! ==========");

    DEBUG_TEXTS = audioconf.debug_lsf;

    var frame_step_samples = audioconf.frame_step_samples;
    
    var lsforder = audioconf.lsforder;
    var lsflength = audioconf.lsflength; // Should be order +1
    
    var mfccorder = audioconf.mceporder;
    var mfcclength = audioconf.mceplength;  // Should be order +1
    

    var lsf_start = 1;
    var mfcc_start = lsflength+1;

    var features_length = mfcclength+lsflength+1;


    var lsf_command = "./analysis_scripts/audio_analyser_lsf.sh";
    var lsf_args = [];

    var lsf = spawn(lsf_command, lsf_args);
    
    lsf.stderr.on('data',  function(err)  { show_error(err.toString(), 'lsf stderr'); 
					    process.emit('lsfDone', user, packetcode); });

    lsf.on('error',  function(err)  { show_error(err, 'lsf on error'); });
    
    lsf.on('uncaughtException', function(err) { show_error(err, 'lsf on uncaughtexp');});
    
    lsf.on('exit',  function(exit_code)  {
	if (exit_code == 0) {
	    // Write to designated outputbuffer
	    print_debug('mfcc analysis done; Data length: '+outputbuffer.length);

	    var m = lsf_start*4;
	    for (var n=0; n<outputbuffer.length; n+=4) {
		outputbuffer.copy(targetbuffer, m, n, n+lsflength*4);
		m += features_length*4;
	    }	    
	    if (debug) {
		fs.writeFileSync('upload_data/debug/lsf_feature', outputbuffer);
	    }	    
	    print_debug('Emitting lsfDone');
	    process.emit('lsfDone', user, packetcode);
	}	
	show_exit(exit_code, 'lsf'); 
    });



    lsf.stdout.on('data', function(data) {
	outputbuffer = Buffer.concat([outputbuffer, data]);	
    });
    

    // Some heavy debugging: 
    fs.writeFile("upload_data/debug/"+user+"_lsfdata_"+packetcode, inputbuffer, function(err) {
	if(err) {
            show_error(err);
            return;
        }
	print_debug( "The file upload_data/debug/"+user+"_lsfdata_"+packetcode +"was saved!");
    });


    lsf.stdin.write(inputbuffer, function(err){if (!err) { print_debug("writing to frame finished"); lsf.stdin.end() } });


    

}



function show_error(err, source) {
    print_debug("=LSF=== Error from "+source);
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
	console.log("=LSF=== "+text);
    }
}



module.exports = { compute_lsf : compute_lsf };
