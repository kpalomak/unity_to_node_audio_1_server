
/*
 *  Take a float buffer, run it through SPTK tools to extract
 *  necessary parameters (LSF, MCEP, F0), stack the parameters
 *  into another a float buffer that is provided as input:
 *
 */


//var config=require('config');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

var feature_timeout_ms = 15000; // 15s 
var DEBUG_TEXTS = true;
var streamifier = require('streamifier');

function compute_features(audioconf, inputbuffer,outputbuffer) {

    print_debug("============  FEATURE COMPUTATION, HOW EXCITING!!! ==========");

    var frame_step_samples = audioconf.frame_step_samples;
    var pitch_low = audioconf.pitch_low;
    var pitch_high = audioconf.pitch_high;
    
    var lsforder = audioconf.lsforder;
    var lsflength = audioconf.lsflength; // Should be order +1
    
    var mfccorder = audioconf.mceporder;
    var mfcclength = audioconf.mceplength;  // Should be order +1
    

    var lsf_start = 1;
    var mfcc_start = lsflength+1;

    var features_length = mfcclength+lsflength+1;

    var pitchcommand = "pitch -a 0 -s 16 -p "+frame_step_samples+" -L "+pitch_low+" -H "+pitch_high+"  <&0 | x2x +fa | awk '{if ($1>0) {print log($1)} else {print \"-1.0E10\"}}' | x2x +af | x2x +fa";
    
    var lsfcommand = "frame -l 400 -p "+frame_step_samples+" | window -l 400 -L 512 -w 1 | lpc -l 512 -m "+lsforder+" -f 0.001 | lpc2lsp -m  "+lsforder+" -s "+lsflength+"";
    
    var mfcccommand ="frame -l 400 -p "+frame_step_samples+" | window -l 400 -L 512 -w 1 | mfcc -l 512 -m "+ mfccorder +" -f 0.001 -E ";


    var pitch_command = "pitch";
    var pitch_args = ["-a", "0", "-s", "16", "-p", frame_step_samples, "-L", pitch_low, "-H", pitch_high];

    var float_to_ascii_command = "x2x";
    var float_to_ascii_args = ["+fa"];

    var awk_f0_command = "awk";
    var awk_f0_args = ['{if ($1>0) {print log($1)} else {print "-1.0E10"}}'];
    
    var ascii_to_float_command  =  "x2x";
    var ascii_to_float_args = ["+af"];

    var frame_command = "frame";
    var frame_args =  ["-l", "400", "-p", frame_step_samples];
    
    var window_command = "window";
    var window_args = ["-l",  "400", "-L", "512", "-w", "1"];

    var lpc_command = "lpc";
    var lpc_args = ["-l", "512", "-m", ''+lsforder, "-f", "0.001"];

    var lsf_command = "lpc2lsp";
    var lsf_args = ["-m", lsforder, "-s", lsflength];

    var mfcc_command ="mfcc";
    var mfcc_args = ["-l", "512", "-m", mfccorder, "-f", "0.001", "-E"];


    var pitch          = spawn(pitch_command, pitch_args);
    var ascii_to_float = spawn(ascii_to_float_command, ascii_to_float_args);
    var float_to_ascii = spawn(float_to_ascii_command, float_to_ascii_args);
    var awk_f0         = spawn(awk_f0_command, awk_f0_args);

    var frame          = spawn(frame_command, frame_args);
    var window         = spawn(window_command, window_args);

    var lsf            = spawn(lsf_command, lsf_args);
    var lpc            = spawn(lpc_command, lpc_args);


    var mfcc           = spawn(mfcc_command, mfcc_args);


/*    // Listen for an exit event:
    pitch.on('exit', function (exitCode) {
	print_debug("Child exited with code: " + exitCode);
    });*/


    pitch.on('error', function(err)   { show_error(err, 'pitch'); });
    ascii_to_float.on('error', function(err)   { show_error(err, 'ascii_to_float'); });
    float_to_ascii.on('error', function(err)   { show_error(err, 'float_to_ascii'); });
    awk_f0.on('error',  function(err) { show_error(err, 'awk_f0');});

    frame.on('error',  function(err)  { show_error(err, 'frame'); });
    window.on('error',  function(err)  { show_error(err, 'window'); });

    lpc.on('error',  function(err)  { show_error(err, 'lpc'); });
    lsf.on('error',  function(err)  { show_error(err, 'lsf'); });

    mfcc.on('error',  function(err)  { show_error(err, 'mfcc'); });

    
    pitch.on('exit', function(exit_code)   { show_exit(exit_code, 'pitch'); });
    ascii_to_float.on('exit', function(exit_code)   { show_exit(exit_code, 'ascii_to_float'); });
    float_to_ascii.on('exit', function(exit_code)   { show_exit(exit_code, 'float_to_ascii'); });
    awk_f0.on('exit',  function(exit_code) { show_exit(exit_code, 'awk_f0');});

    frame.on('exit',  function(exit_code)  { show_exit(exit_code, 'frame'); });
    window.on('exit',  function(exit_code)  { show_exit(exit_code, 'window'); });

    lpc.on('exit',  function(exit_code)  { show_exit(exit_code, 'lpc'); });
    lsf.on('exit',  function(exit_code)  { show_exit(exit_code, 'lsf'); });

    mfcc.on('exit',  function(exit_code)  { show_exit(exit_code, 'mfcc'); });
	     


    pitch.stdout.on('data', function (data) {	
	print_debug("Pitch: " + data.length);
	float_to_ascii.stdin.write(data);
	//float_to_ascii.stdin.end();
    });    


    float_to_ascii.stdout.on('data', function (data) {	
	print_debug("float to ascii: "+data);
        awk_f0.stdin.write(data);
	//awk_f0.stdin.end();
    });

 
    awk_f0.stdout.on('data', function (data) {	
	print_debug("awk_f0: "+data);
        ascii_to_float.stdin.write(data);
	//ascii_to_float.stdin.end();
    });   


    ascii_to_float.stdout.on('data', function (data) {
	print_debug("ascii to float: "+data.length);
	var m = 0;
	for (var n=0; n<data.length; n+=4) {
	    data.copy(outputbuffer, m, n, n+4);
	}
    });

    frame.stdout.on('data', function (data) {
	print_debug('Framed, now windowing '+ data.length);
	window.stdin.write(data);
	//window.stdin.end();
    });

    window.stdout.on('data', function(data) {
	print_debug('Windowed, now mfcc\'ing... '+data.length);
	mfcc.stdin.write(data);
	mfcc.stdin.end();
	print_debug('                       ... and lpc\'ing ' +data.length);
	lpc.stdin.write(data);
	lpc.stdin.end();	
    });

    lpc.stdout.on('data', function(data) {
	// Write to designated outputbuffer
	print_debug('lpc analysis done, let\'s lsf: Data length: '+data.length);
	lsf.stdin.write(data);
	//lsf.stdin.end();
    });

    lsf.stdout.on('data', function(data) {
	// Write to designated outputbuffer
	print_debug('lsf analysis done; Data length: '+data.length);
	var m = lsf_start*4;
	for (var n=0; n<data.length; n+=4) {
	    data.copy(outputbuffer, m, n, n+lsflength*4);
	    m += features_length*4;
	}

    });

    mfcc.stdout.on('data', function(data) {
	// Write to designated outputbuffer
	print_debug('mfcc analysis done; Data length: '+data.length);

	var mfccm = mfcc_start*4;
	for (var mfccn=0; mfccn<data.length; mfccn+=4) {
	    data.copy(outputbuffer, mfccm, mfccn, mfccn+mfcclength*4);
	    mfccm += features_length*4;
	}
	
    });


//    var stream = require('stream');
//    var bufferStream = new stream.PassThrough();
//    bufferStream.end(new Buffer(inputbuffer));

//    var bufferStream = streamifier.createReadStream(inputbuffer);
    //bufferStream.pipe(float_to_ascii.stdin);


    pitch.stdin.write(inputbuffer);
    pitch.stdin.end();

    //bufferStream.pipe(frame.stdin);
    frame.stdin.write(inputbuffer);
    frame.stdin.end();

    





//    pitch_child.stdin.write(inputbuffer);
//    pitch_child.stdin.end();

/*   

    //inputbuffer.pipe(pitch_child.stdin);


    // Why would feature extraction get stuck?
    // If it does, kill it after feature_timeout_ms:
    setTimeout(function () {
	pitch_child.kill();
    }, feature_timeout_ms);

*/

/*
    // Same as above but for lsf;
    lsf_child.stdout.on('data', function (data) {
	print_debug("Got data from child: " + data);
    });
    lsf_child.on('exit', function (exitCode) {
	print_debug("Child exited with code: " + exitCode);
    });
    setTimeout(function () {
	lsf_child.kill();
    }, feature_timeout_ms);


    // Same as above but for mfcc:
    mfcc_child.stdout.on('data', function (data) {
	print_debug("Got data from child: " + data);
    });
    mfcc_child.on('exit', function (exitCode) {
	print_debug("Child exited with code: " + exitCode);
    });
    setTimeout(function () {
	mfcc_child.kill();
    }, feature_timeout_ms);

*/


}



function show_error(err, source) {
    console.log("Error from "+source);
    console.log(err);
}



function show_exit(exit_code, source) {
    if (exit_code==0) 
    {
	print_debug(source + " exited with code "+exit_code);
    }
    else 
    {
	console.log(source + " exited with code "+exit_code);
    }
}


function print_debug(text) {
    if (DEBUG_TEXTS) 
    {
	console.log(text);
    }
}



module.exports = { compute_features : compute_features };
