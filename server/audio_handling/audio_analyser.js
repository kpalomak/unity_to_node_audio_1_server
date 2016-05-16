
/*
 *  Take a float buffer, run it through SPTK tools to extract
 *  necessary parameters (LSF, MCEP, F0), stack the parameters
 *  into another a float buffer that is provided as input:
 *
 */

if (process.env.NODE_ENV !== 'production'){
    longjohn = require('longjohn');
    longjohn.async_trace_limit = 25;   // defaults to 10
}

var logging = require('../game_data_handling/logging.js');



////var config=require('config');
//var spawn = require('child_process').spawn;
//var exec = require('child_process').exec;

//var feature_timeout_ms = 15000; // 15s 
var DEBUG_TEXTS = true;
////var streamifier = require('streamifier');

//var sptk_path='/usr/local/bin/';

var debug = true;

if (debug) {
    var fs = require('fs');
}


//var mfcc_analysis = require('./audio_analyser_mfcc');
//var f0_analysis = require('./audio_analyser_f0');
//var lsf_analysis = require('./audio_analyser_lsf');

var all_feature_analysis = require('./audio_analyser_all');


function compute_features(audioconf, inputbuffer,outputbuffer, user, word_id, packetcode, maxpoint) {

    print_debug(user, "=FEAT: packetnr "+ packetcode +" range: "+ (maxpoint-inputbuffer.length)+"-"+maxpoint+" ==========");

    //this.audioconf = audioconf;
    //this.inputbuffer = inputbuffer;
    //this.outputbuffer = outputbuffer;
    
    const noisedbuffer = new Buffer(inputbuffer);

    var addcount = 0;
    for (n=0; n < inputbuffer.length; n+=4) {
	var oldval=Math.abs(inputbuffer.readFloatLE(n))
	if (oldval < 0.001 ) {	   
	    newval=(Math.random()-0.5)/10.0;
	    //console.log("Replacing "+oldval + " with " + newval);
	    noisedbuffer.writeFloatLE( newval, n);
	    addcount++;
	}
    }	       
    print_debug(user, "Added noise for "+addcount +" entries");

    //mfcc_analysis.compute_mfcc(audioconf, noisedbuffer,outputbuffer, user, word_id, packetcode);
    //lsf_analysis.compute_lsf(audioconf, noisedbuffer,outputbuffer, user, word_id, packetcode);
    //f0_analysis.compute_f0(audioconf, inputbuffer,outputbuffer, user, word_id, packetcode);

    all_feature_analysis.compute_features(audioconf, inputbuffer,outputbuffer, user, word_id, packetcode, maxpoint);
}




function print_debug(user,text) {
    if (DEBUG_TEXTS) 
    {
	console.log( "\x1b[37m%s\x1b[0m", logging.get_date_time().datetime + ' '+user + ': '+text);
    }
}




module.exports = { compute_features : compute_features };
