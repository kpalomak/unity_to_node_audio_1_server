
/*
 * A simple script that receives binary data through HTTP(S) POST in pieces and feeds it to
 * a momentarily non-existent processing script.
 *
 * Intended to do almost-real-time audio processing.
 *
 */


// From: http://stackoverflow.com/questions/13478464/how-to-send-data-from-jquery-ajax-request-to-node-js-server

var http = require('http');
var util = require('util');


var fs = require('fs');

// Events needed for data processing:
//var events = require('events');
//var eventEmitter = require('./emitters.js');
//var eventEmitter = new events.EventEmitter();


//var recogniser_client =  require('./recogniser_client');


var userdata = {};

var RecogniserClient = require('./recogniser_client');

var SegmentationHandler  = new require('./scoring_modules/segmentation_handler.js');

var audioconf = {
    'fs'                     : 16000,
    'max_utterance_length_s' : 10,
    'max_packet_length_s'    : 1,
    'datatype_length'        : 4,
    'frame_step_samples'     : 128,
    'frame_length_samples'   : 400,
    'feature_dim'            : 30,
    'pitch_low'              : 60,
    'pitch_high'             : 240,
    'lsforder'               : 15,
    'lsflength'              : 16, // Should be order +1
    'mceporder'              : 12,
    'mceplength'             : 13,
    'mcepindexes'            : [0,1,2,3,4,5,6,7,8,9,10,11,12],
    'f0indexes'              : [13],
    'lsfindexes'             : [14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29],
    'dimensions'             : 30, // 16 + 13 + 1
    'debug_mfcc'             : true,
    'debug_f0'               : true,
    'debug_lsf'              : true
};

var recogconf = {
    'grammar' : 'words.conf',
    'packet_size' : 2048,
    'pause_between_packets' : 20
}




if (process.env.NODE_ENV !== 'production'){
    require('longjohn');
    var debug = true;
}

function debugout(msg) {
    if (debug==true) {
	console.log(msg);
    }
}



http.createServer(function (req, res) {
    
    res.setHeader('Content-Type', 'application/json');

    debugout('Request received: ');
    //util.log(util.inspect(req)) // this line helps you inspect the request so 
                                  // you can see whether the data is in the url (GET) 
                                  // or the req body (POST)
    //util.log('Request recieved: \nmethod: ' + req.method + '\nurl: ' + req.url) // this line logs just the method and url

    user = req.headers['x-siak-user'];
    packetnr = req.headers['x-siak-packetnr'];

    console.log("user: "+user);

    if (user) {
	if (packetnr == -2) {
	    init_userdata(user);
	} 

	else if (packetnr == -1) {
	    userdata[user].currentword = req.headers['x-siak-current-word'];	

	    //userdata[user].recogniser.define_word( userdata[user].currentword );
	    console.log("We got word: "+userdata[user].currentword);
	    set_word_and_init_recogniser(user, userdata[user].currentword);
	    
	}	
	else {
	    if (packetnr == 0 ) {

	    }
	    
	    finalpacket = req.headers['x-siak-final-packet'];
	    arraystart = parseInt(req.headers['x-siak-packet-arraystart']);
	    arrayend = parseInt(req.headers['x-siak-packet-arrayend']);
	    arraylength = parseInt(req.headers['x-siak-packet-arraylength']);
	    
	    //debugout("Packet nr "+packetnr + " finalpacket " +finalpacket+" arraystart " + arraystart+ " arrayend " + arrayend);
	    
	    userdata[user].thisstart=arraystart;
	    
	    if (finalpacket == "true") {
		lastpacket=packetnr;
		userdata[user].lastpacketnr=packetnr;
	    }
	    else {
		lastpacket = false;
	    }
	    
	    var startcounter=0;
	    var chunkct=0;
	    var postdata = '';
	}

	req.on('data', function (chunk, encoding) {
	    
	    postdata += chunk;

   	});
	
	req.on('end', function () {
	    if (packetnr == -2) {
		userdata[user].initreply = res;
	    }
	    else if (packetnr == -1) {		
		userdata[user].readyreply = res;
	    }	    
	    else {
		console.log("Segmenter's word: "+userdata[user].segmenter.whats_my_word());
		console.log("Recognier's word: "+userdata[user].recogniser.whats_my_word());

		userdata[user].packetset[ packetnr ] = 1;
	    
		// For debug:
		if (debug) { fs.writeFile("upload_data/debug/"+user+"_packet_"+packetnr, postdata); }
	    	
		decodedchunks=new Buffer(postdata, 'base64');
		
		debugout( "Copying from index " + 0 + "-"+  decodedchunks.length +
			  " in source to "+ (arraystart*audioconf.datatype_length) + "-"+   + 
			  ( (arraystart*audioconf.datatype_length) + decodedchunks.length ) +
			  " in target buffer (length "+decodedchunks.length+")" );
		
		decodedchunks.copy( // src buffer
		    userdata[user].audiobinarydata, // targetbuffer
		    arraystart*audioconf.datatype_length, // targetstart
		    0, // sourcestart
		    decodedchunks.length); //source-length	 	    
		
		console.log("userdata[user].bufferend = Math.max( "+(arrayend)*audioconf.datatype_length+", "+userdata[user].bufferend+")");

		userdata[user].bufferend = Math.max( (arrayend)*audioconf.datatype_length, userdata[user].bufferend);		
		processDataChunks(user, res, packetnr);		
	    }
	});
    }
}).listen(process.env.PORT || 8001);


debugout('Server running on port '+ (process.env.PORT || 8001) );



function initialisation_reply(user) {    
    res_json = audioconf;
    res_json.msg="<br>Recognition server initialised!";
    userdata[user].initreply.end( JSON.stringify(res_json) );
}


function word_select_reply(user) {
    res_json = {
	msg: "<br>Segmentation server initialised!"
    };
    userdata[user].readyreply.end( JSON.stringify({res_json}) );
}



function init_userdata(user) {
    if (typeof userdata[user] == 'undefined') {
	userdata[user] = {};

	userdata[user].chunkeddata = new Buffer( audioconf.max_packet_length_s * audioconf.fs * audioconf.datatype_length );

	userdata[user].audiobinarydata = new Buffer( 
	    audioconf.max_utterance_length_s * audioconf.fs * audioconf.datatype_length );

	userdata[user].featuredata = new Buffer( 
	    Math.ceil(audioconf.max_utterance_length_s * 
		      audioconf.fs / 
		      audioconf.frame_step_samples * 
		      audioconf.feature_dim ) );	

	userdata[user].recogniser_ready = false;
	userdata[user].segmenter_ready = false;

	// init recogiser and segmenter:
	userdata[user].recogniser = new RecogniserClient(recogconf, user, null);
	userdata[user].segmenter = new RecogniserClient(recogconf, user, "init_segmenter");		
	
	userdata[user].segmentation_handler = new SegmentationHandler(user);
	
	console.log("Initialising classifier:");

    }
    clearUpload(user);
}


function set_word_and_init_recogniser(user, word) {
    userdata[user].recogniser.init_recog();
    setTimeout (function() {
	userdata[user].segmenter.init_segmenter(word);
    }, 80);

    userdata[user].segmentation_handler.init_classification(word);
    
}



function clearUpload(user) {
    debugout('Clearing upload data');

    userdata[user].chunkeddata.fill(0);	   
    userdata[user].audiobinarydata.fill(0);
    userdata[user].featuredata.fill(0);

    
    userdata[user].packetset=[];

    userdata[user].lastpacketnr=-2;

    userdata[user].analysedpackets=[];
    
    userdata[user].bufferend=0;
    userdata[user].sent_to_analysis=0;
    userdata[user].sent_to_recogniser = 0;

    userdata[user].featuresdone= [0,0,0];

    userdata[user].analysed = 0;

    userdata[user].currentword=null;
    userdata[user].recognised_word = false;

    userdata[user].segmentation_complete = false;
    userdata[user].recognition_complete = false;

    userdata[user].state_statistics = null;
}



function processDataChunks(user, res, packetnr) {


    if (array_contains(userdata[user].analysedpackets, packetnr))
    {
	console.log("Packet "+packetnr +" already processed - Where did the request come from?");
	return;
    }
    
    userdata[user].analysedpackets.push(packetnr);

    debugout('Processing chunk '+packetnr);

    syncAudioAnalysis(user)

    if (packetnr > -1) {
	// Do stuff with packet of audio data: 
	process.emit('sendAudioForAnalysis', user);
    }

    if (userdata[user].lastpacketnr < 0) {
	// We do not know yet what is the last packet.
	// acknowledge with message:
	if (packetnr > -1) {
	    res.end( JSON.stringify(
		{
		    msg: "<br>Processing packet "+packetnr+" ---"
		} ));
	}
    }
    else {
	// We know what the last packet is;
	// If it's not this one, we might have received it earlier and
	// it's waiting to for the data to be complete:

	if (packetnr != userdata[user].lastpacketnr) {
	    
	    // We know this is not the last packet, so reply to it quickly:
	    res.end( JSON.stringify(
		{
		    msg: "<br>Processing packet "+packetnr+" --- Last packet is "+userdata[user].lastpacketnr 
		} ));
	    

	    // Emit an event to the listener holding back the reply to the last packet
	    // (This is just for the odd possibility that packages would arrive
	    // in a strange order.)
	    process.emit('lastPacketCheck', user);


	}
	else {
	    // We're dealing with the last packet; Let's see if we have received all packets:
	    // Count packets, see if it matches our nubmer:

	    userdata[user].lastPacketRes=res;
	    process.emit('lastPacketCheck', user);
	}
    }
}




function checkLastPacket(user) {
    
    var chunkcount = -1;    
    userdata[user].packetset.forEach( function(element, index, array) {
	chunkcount++;
    });
    

    // Check if we have all the packets in already:
    if (chunkcount == userdata[user].lastpacketnr ) {	
	
	// Send a null packet to recogniser as sign of finishing:
	console.log('==((===))=== Finishing audio:');


	userdata[user].recogniser.finish_audio();

	setTimeout (function() {
	    userdata[user].segmenter.finish_audio();

	}, 80);
	
	
	if (debug) {
	    fs.writeFile("upload_data/debug/"+user+"_floatdata", userdata[user].audiobinarydata.slice(0,userdata[user].bufferend), function(err) {
		if(err) {
		    debugout(err);
		    return;
		}	    
		debugout( "The file was saved!");
		//clearUpload(user);	    
	    }); 
	}	

	
    }
//    else {
//	debugout( "Checking for last: "+chunkcount+" == "+userdata[user].lastpacketnr );
//	process.emit('sendAudioForAnalysis', user);
//    }
}







function syncAudioAnalysis(user) {

    // Which part of the buffer can be already analysed?
    // Let's suppose for now that the packets arrive in order and so

    var analysis_range_start=userdata[user].sent_to_analysis;    
    var recog_range_start =userdata[user].sent_to_recogniser; 

    if (analysis_range_start > audioconf.frame_length_samples - audioconf.frame_step_samples) 
    {
	// Take into account the frame overlap:
	analysis_range_start -= 
	    Math.floor( audioconf.frame_length_samples / 
			audioconf.frame_step_samples) * audioconf.frame_step_samples; 
    }

    var analysis_range_end= (userdata[user].bufferend - (userdata[user].bufferend % audioconf.frame_step_samples));
    var recog_range_end= userdata[user].bufferend;

    var analysis_range_length = analysis_range_end - analysis_range_start;

    var result_range_length = analysis_range_length - Math.floor(audioconf.frame_length_samples/audioconf.frame_step_samples)*audioconf.frame_step_samples;



    if (analysis_range_length > 0) {
    // Send data to the DNN feature extractor:
	var audio_analyser = require('./audio_analyser');
	
	audio_analyser.compute_features( audioconf,
					 userdata[user].audiobinarydata.slice(analysis_range_start,analysis_range_length), 
					 userdata[user].featuredata.slice( analysis_range_start, result_range_length ),
					 user,
					 analysis_range_end);
    }

    if (recog_range_end-recog_range_start > 0) {
	// Send data to the recogniser processes:
	send_to_recogniser(user, userdata[user].sent_to_recogniser, recog_range_end  );
    }

    userdata[user].sent_to_analysis=analysis_range_end;
    userdata[user].sent_to_recogniser = recog_range_end;


    
}





function send_to_recogniser(user, datastart, dataend) {

    //console.log("************ Sending to recogniser "+(dataend - datastart)+" floats of data!");

    // Write the floats into a 16-bit signed integer buffer:

    pcmdata = new Buffer( (dataend-datastart) /2);

    var okcount=0;
    var notokcount = 0;

    pcmindex=0;


    for (var i = datastart; i < datastart+(pcmdata.length*2); i+=4) {
	try {
	    pcmdata.writeInt16LE( (userdata[user].audiobinarydata.readFloatLE(i) * 32767), pcmindex );
	    pcmindex+=2;
	    okcount++;
	}
	catch (err) {	    
	    pcmindex+=2;
	    //console.log(err.toString());
	    notokcount++;
	}
    }
    if (notokcount > 0) {
	console.log("ERRRRROOOOORRRRRSSSS!!!!!!!!  Bad floats in "+notokcount+" of "+(okcount+notokcount)+" values");

    }

    // Send the 16-bit buffer to recogniser and segmenter processses:

    userdata[user].segmenter.send_audio(pcmdata);
    userdata[user].recogniser.send_audio(pcmdata);
  
}




/* EVENTS */


process.on('segmenter_ready', function (user, word) {   
    console.log( '   // Received event: // Segmenter ready for word '+word+' for user '+user); 
 
    userdata[user].segmenter_ready = true;
    userdata[user].currentword = word;
    if (userdata[user].recogniser_ready) {
	word_select_reply(user);
    }
});

	   
process.on('recogniser_ready', function (user) {    
    console.log( '   // Received event: // Recogniser ready for user '+user); 

    userdata[user].recogniser_ready = true;    
    if (userdata[user].segmenter_ready) {
	word_select_reply(user);
    }    
});




process.on('segmenter_loaded', function (user, word) {   
    console.log( '   // Received event: // Segmenter loaded for word '+word+' for user '+user); 
 
    userdata[user].segmenter_loaded = true;
    userdata[user].currentword = word;
    if (userdata[user].recogniser_loaded) {
	initialisation_reply(user);
    }
});

	   
process.on('recogniser_loaded', function (user) {    
    console.log( '   // Received event: // Recogniser loaded for user '+user); 

    userdata[user].recogniser_loaded = true;    
    if (userdata[user].segmenter_loaded) {
	initialisation_reply(user);
    }    
});


process.on('lastPacketCheck', function(user)  {
    console.log( '   // Received event: // lastPacketCheck for user '+user); 
    checkLastPacket(user);
});


process.on('sendAudioForAnalysis', function (user) {
    console.log( '   // Received event: // sendAudioForAnalysis for user '+user); 
    syncAudioAnalysis(user);
});


process.on('mfccDone', function (user, packetcode) { 
    console.log( '   // Received event: // mfcc '+packetcode+' done for '+user); 
    userdata[user].featuresdone[0] = Math.max( userdata[user].featuresdone[0], packetcode );    
    check_feature_progress(user);
});

process.on('lsfDone', function (user, packetcode) { 
    console.log( '   // Received event: // lsf '+packetcode+' done for '+user); 
    userdata[user].featuresdone[1] = Math.max( userdata[user].featuresdone[1], packetcode );    
    check_feature_progress(user);
});

process.on('logF0Done', function (user, packetcode) { 
    console.log( '   // Received event: // logF0 batch '+packetcode+' done for '+user); 
    userdata[user].featuresdone[2] = Math.max( userdata[user].featuresdone[2], packetcode );    
    check_feature_progress(user);
});


process.on('recognised', function(user, word) {
    console.log('   // Received event: // word recognised: "'+word+'" for '+user); 
    userdata[user].recognised_word = word;

    userdata[user].recognition_complete = true;    
    check_feature_progress(user);
});

process.on('recognition_error', function(user, word) {
    console.log('   // Received event: // word NOT recognised: "'+word+'" for '+user); 
    userdata[user].recognised_word = word;

    userdata[user].recognition_complete = true;
    check_feature_progress(user);
});

process.on('segmented', function(user, word, segmentation) {
    console.log('   // Received event: // word segmented: "'+word+'" for '+user); 

    if (segmentation.length > 0) {

	userdata[user].segmentation = userdata[user].segmentation_handler.segmentation_to_state_list(segmentation);
	userdata[user].segmentation_complete = true;

    }
    else 
    {
	console.log("SEGMENTATION FAILED!");
	userdata[user].segmentation = null;	

	userdata[user].segmentation_complete = true;
    }
    check_feature_progress(user);
});


process.on('segmentation_error', function(user, word, segmentation) {
    console.log('   // Received event: // word NOT segmented: "'+word+'" for '+user); 

    userdata[user].segmentation = null;
    userdata[user].segmentation_complete = true;

    check_feature_progress(user);
});





function check_feature_progress(user) {

    if (Math.min.apply (Math,userdata[user].featuresdone) >= userdata[user].analysed )
    {
	
	// Analyse up to the new max point.
	var maxpoint =  Math.min.apply (Math, userdata[user].featuresdone);
	//debugout("*** Got data up to "+ maxpoint + ", lastpacket="+userdata[user].lastpacketnr);
	
	userdata[user].analysed = maxpoint;
	
	if (maxpoint => userdata[user].bufferend) {

	    debugout("*** Data processed up to the bufferend, was it the last packet already? lastpacketnr: "+ userdata[user].lastpacketnr);
	    if (userdata[user].lastpacketnr > -1) {
		debugout("*** Last packet, here goes!" );

		if (userdata[user].segmentation_complete)  {
		    
		    if (userdata[user].state_statistics == null) {
			
			userdata[user].state_statistics = "Working...";
			
			userdata[user].state_statistics = 
			    userdata[user].segmentation_handler.calculate_statistics(
				userdata[user].segmentation, 
				userdata[user].featuredata.slice(0, userdata[user].bufferend), 
				audioconf);
		    }
		}
		
		
		if (userdata[user].recognition_complete ) {
		    
		    if (debug) { 
			debugout("*** writing pcm buffer to file:");		    
			if (Buffer.isBuffer(userdata[user].pcm)) {
			    fs.writeFileSync('upload_data/debug/pcm_'+user, userdata[user].pcm);
			    debugout("*** wrote to upload_data/debug/pcm_"+user);
			}
		    }
		    
		    // We have last packet analysed and a segmentation ready, so let's
		    // calculate statistics and get classification results!
		    
		    
		    
		    // Send a random number back, as we don't know of any better.
		    userdata[user].lastPacketRes.end( JSON.stringify(
			{score: 5.0*Math.random(), 
			 recognised_word: userdata[user].recognised_word,
			 msg: "<br>All " + userdata[user].lastpacketnr +" packets received!"}) );
		    
		    clearUpload(user)
		}
	    }
	}
	
	//userdata[user].featuresdone = [false,false,false];
    }
    else {
	debugout("*** Waiting for more features: ("+ userdata[user].featuresdone.toString() +" / "+  Math.min.apply (Math, userdata[user].featuresdone)   +" segment: "+userdata[user].segmentation_complete + " recog: "+ userdata[user].recognition_complete +" ) ")
    }
    
}


// From http://stackoverflow.com/questions/237104/how-do-i-check-if-an-array-includes-an-object-in-javascript

function array_contains(array, obj) {
    var i = array.length;
    while (i--) {
       if (array[i] === obj) {
           return true;
       }
    }
    return false;
}
