

if (process.env.NODE_ENV !== 'production'){
    print_debug('Requiring longjohn:');
    longjohn = require('longjohn');

    longjohn.async_trace_limit = 25;   // defaults to 10
}
var logging = require('../game_data_handling/logging.js');

var featext_command = "./audio_handling/audio_analyser_all.sh";

//var eventEmitter = require('./emitters.js');

//var config=require('config');
var spawn = require('child_process').spawn;
//var exec = require('child_process').exec;

var feature_timeout_ms = 15000; // 15s 
var DEBUG_TEXTS = false;

var sptk_path='/usr/local/bin/';

var debug = true;
var DEBUG_TEXTS = true;

var fs = require('fs');

if (debug) {
    var fs = require('fs');
}

var outputbuffer = Buffer.concat([]);


function compute_features(audioconf, inputbuffer, targetbuffer, user, word_id, packetcode, maxpoint) {

    print_debug("== EXCITING!!! user: "+user+" word_id: "+word_id+" packetcode: "+ packetcode +" maxpoint: " +maxpoint +"======");

    var tmpdir = "/dev/shm/siak-"+process.pid+"-"+user+"_"+word_id+"_"+packetcode+"_"+Date.now();

    fs.mkdirSync(tmpdir);

    var tmpinput = tmpdir+"/feature_input";
    var tmpoutput = tmpdir+"/feature_output";
	
    fs.writeFile(tmpinput, inputbuffer, function(err) {
	if(err) {
            show_error(err, "writefile "+tmpinput);
	}
	else {
	    
	    print_debug( user, "Starting the shell script now:");
	    
	    
	    var featext_args = [tmpinput, tmpoutput];
	    
	    var featext = spawn(featext_command, featext_args);
	    
	    featext.stderr.on('data',  function(err)  { show_error(err.toString(), 'feat stderr'); 
							process.emit('user_event', user, word_id, 'features_done', {packetcode:packetcode, maxpoint:0}); });
	    
	    featext.on('error',  function(err)  { show_error(err, 'Feat on error'); });
	    
	    featext.on('uncaughtException', function(err) { show_error(err, 'Feat on uncaughtexp');});
	    
	    featext.on('close',  function(exit_code)  { 
		print_debug( user, "Shell script exit: "+exit_code.toString());
		if (exit_code == 0) {
		    
		    // Copy the features for debug purposes:
		    //fs.createReadStream( tmpoutput ).pipe(fs.createWriteStream('/tmp/feat'));
		    

		    fs.readFile(tmpoutput, function (err, outputbuffer) {
			if (err) throw err;
			
			print_debug( user, "From outputbuffer to targetbuffer: 0,"+outputbuffer.length)

			//for (var n=0; n< 120; n+=4) {
			//    print_debug( user, (n/4)+" "+outputbuffer.readFloatLE(n));
			//}

			outputbuffer.copy(targetbuffer, 0, 0, outputbuffer.length);

			print_debug( user, 'Feature analysis done; Data length: '+outputbuffer.length);	   
			
			print_debug( user, 'Emitting features_done');
			process.emit('user_event', user, word_id, 'features_done', {packetcode:packetcode, maxpoint:maxpoint}); 			
			
			
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


function print_debug(user,text) {
    if (DEBUG_TEXTS) 
    {
	console.log( "\x1b[37maudio2  %s\x1b[0m", logging.get_date_time().datetime + ' '+user + ': '+text);
    }
}

module.exports = { compute_features : compute_features };
