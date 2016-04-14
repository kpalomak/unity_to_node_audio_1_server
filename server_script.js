


var debug = require('debug');


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

var logging = require('./logging');

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


    debugout('Request received: ');
    
    res.setHeader('Content-Type', 'application/json');


    //util.log(util.inspect(req)) // this line helps you inspect the request so 
                                  // you can see whether the data is in the url (GET) 
                                  // or the req body (POST)
    //util.log('Request recieved: \nmethod: ' + req.method + '\nurl: ' + req.url) // this line logs just the method and url

    user = req.headers['x-siak-user'];
    packetnr = req.headers['x-siak-packetnr'];

    console.log("user: "+user);


    // TODO: Implement user authentication and logging!!!

    if (user == null) {
	res_json = {
            msg: "<br>User \""+user+"\" not authorised!"
	};
	res.statusCode = 401;
	res.end( JSON.stringify({res_json}) );
    }
    else
	if (packetnr == -2) {
	    init_userdata(user);

	    logging.log_event({user: user, event: "initialise"});
	    
	} 

	else if (packetnr == -1) {
	    userdata[user].currentword.reference = req.headers['x-siak-current-word'];	

	    //userdata[user].recogniser.define_word( userdata[user].currentword );
	    console.log("We got word: "+userdata[user].currentword.reference);
	    set_word_and_init_recogniser(user, userdata[user].currentword.reference,userdata[user].currentword.id );
	    
	    logging.log_event({user: user, event: "set_word", word: userdata[user].currentword.reference});
	}	
	else {
	    if (packetnr == 0 ) {
		logging.log_event({user: user, event: "start_audio", wordid: userdata[user].currentword.id, word: userdata[user].currentword.reference});		
	    }
	    
	    finalpacket = req.headers['x-siak-final-packet'];
	    arraystart = parseInt(req.headers['x-siak-packet-arraystart']);
	    arrayend = parseInt(req.headers['x-siak-packet-arrayend']);
	    arraylength = parseInt(req.headers['x-siak-packet-arraylength']);
	    



	    //debugout("Packet nr "+packetnr + " finalpacket " +finalpacket+" arraystart " + arraystart+ " arrayend " + arrayend);
	    
	    
	    if (finalpacket == "true") {
		lastpacket=packetnr;
		userdata[user].currentword.lastpacketnr=packetnr;
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

		if (array_contains(userdata[user].currentword.analysedpackets, packetnr))
		{
		    console.log("Packet "+packetnr +" already processed - The client tried resending?");
		    
		}
		else 
		{
		    debugout("Segmenter's word: "+userdata[user].segmenter.whats_my_word() + " (" +
				userdata[user].segmenter.whats_my_word_id()+")");
		    
		    userdata[user].currentword.packetset[ packetnr ] = 1;
		    
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
		    
		    console.log("userdata[user].bufferend = Math.max( "+
				(arrayend)*audioconf.datatype_length+","+
				userdata[user].currentword.bufferend+")");

		    userdata[user].currentword.bufferend = Math.max( (arrayend)*audioconf.datatype_length, 
							 userdata[user].currentword.bufferend);		
		    processDataChunks(user, userdata[user].currentword.id, res, packetnr);		
		}
	    }
	});
    
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

	userdata[user].chunkeddata = new Buffer( audioconf.max_packet_length_s * 
						 audioconf.fs * 
						 audioconf.datatype_length );

	userdata[user].audiobinarydata = new Buffer( 
	    audioconf.max_utterance_length_s * audioconf.fs * audioconf.datatype_length );

	userdata[user].featuredata = new Buffer( 
	    Math.ceil(audioconf.max_utterance_length_s * 
		      audioconf.fs / 
		      audioconf.frame_step_samples * 
		      audioconf.feature_dim ) );	

	//userdata[user].recogniser_ready = false;
	userdata[user].segmenter_ready = false;

	// init recogiser and segmenter:
	//userdata[user].recogniser = new RecogniserClient(recogconf, user, null);

	userdata[user].segmenter = new RecogniserClient(recogconf, user, "init_segmenter");		
	
	userdata[user].segmentation_handler = new SegmentationHandler(user);
	
	console.log("Initialising classifier:");

    }
    clearUpload(user);
}


function set_word_and_init_recogniser(user, word, word_id) {

    console.log("set_word_and_init_recogniser("+word+")!");
    userdata[user].segmenter.init_segmenter(word, word_id);
    userdata[user].segmentation_handler.init_classification(word, word_id);
    
}



function clearUpload(user) {
    debugout('Clearing upload data');

    userdata[user].chunkeddata.fill(0);	   
    userdata[user].audiobinarydata.fill(0);
    userdata[user].featuredata.fill(0);

    word = {};

    word.id = get_next_word_id(user);

    word.reference = null;
    word.recresult = false;

    word.packetset=[];
    word.lastpacketnr=-2;
    word.analysedpackets=[];

    word.bufferend=0;
    word.sent_to_analysis=0;
    word.sent_to_recogniser = 0;
    
    word.featuresdone= [0,0,0];
    word.analysed = 0;
    
    word.segmentation_complete = false;
    word.state_statistics = null;

    userdata[user].currentword = word;


}



function processDataChunks(user, wordid, res, packetnr) {

    if (wordid != userdata[user].currentword.id) {
	debugout ("A very troubling occasion, word ids don't match ("+wordid+"!="+userdata[user].currentword.id);
    }
    else 
    {
	if (array_contains(userdata[user].currentword.analysedpackets, packetnr))
	{
	    console.log("Packet "+packetnr +" already processed - Where did the request come from?");
	    return;
	}
	
	userdata[user].currentword.analysedpackets.push(packetnr);

	debugout('Processing chunk '+packetnr);

	syncAudioAnalysis(user)

	if (packetnr > -1) {
	    // Do stuff with packet of audio data: 
	    process.emit('user_event', user, wordid,'sendAudioForAnalysis', null);
	}

	if (userdata[user].currentword.lastpacketnr < 0) {
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

	    if (packetnr != userdata[user].currentword.lastpacketnr) {
		
		// We know this is not the last packet, so reply to it quickly:
		res.end( JSON.stringify(
		    {
			msg: "<br>Processing packet "+packetnr+
			    " --- Last packet is "+userdata[user].currentword.lastpacketnr 
		    } ));
		

		// Emit an event to the listener holding back the reply to the last packet
		// (This is just for the odd possibility that packages would arrive
		// in a strange order.)
		process.emit('user_event', user, wordid,'lastPacketCheck', null);


	    }
	    else {
		// We're dealing with the last packet; Let's see if we have received all packets:
		// Count packets, see if it matches our nubmer:

		userdata[user].lastPacketRes=res;
		process.emit('user_event', user, wordid,'lastPacketCheck', null);
	    }
	}
    }
}




function checkLastPacket(user) {
    
    var chunkcount = -1;    
    userdata[user].currentword.packetset.forEach( function(element, index, array) {
	chunkcount++;
    });
    

    // Check if we have all the packets in already:
    if (chunkcount == userdata[user].currentword.lastpacketnr ) {	
	
	// Send a null packet to recogniser as sign of finishing:
	console.log('==((===))=== Finishing audio:');


	//userdata[user].recogniser.finish_audio();

	//setTimeout (function() {
	    userdata[user].segmenter.finish_audio();

    //}, 80);
	
	
	if (debug) {
	    fs.writeFile("upload_data/debug/"+user+"_floatdata", 
			 userdata[user].audiobinarydata.slice(0,userdata[user].currentword.bufferend), 
			 function(err) {
			     if(err) {
				 debugout(err);
				 return;
			     }	    
			     debugout( "The file was saved!");
			     //clearUpload(user);	    
			 }); 
	}	
	
	
    }

}







function syncAudioAnalysis(user) {

    // Which part of the buffer can be already analysed?
    // Let's suppose for now that the packets arrive in order and so
    // I can send data in in an orderly manner:

    var already_sent_to_analysis = userdata[user].currentword.sent_to_analysis;    
    var already_sent_to_recogniser = userdata[user].currentword.sent_to_recogniser;    

    var analysis_range_start=already_sent_to_analysis;
    var recog_range_start =already_sent_to_recogniser;


    // There's overlap in the frames; Windows are by default 
    // 400 samples with a step of 128
    // so for this hypothetical audio data:
    // -------------------------------------------------...
    // |--frame1----|  |--frame5----|  |--frame9----|   ... 
    //     |--frame2----|  |--frame6----|  |--frame10   ...
    //         |--frame3----|  |--frame7----|  |--frame1...
    //             |--frame4----|  |--frame8----|  |--fr...

    // And thus for an arbitrary piece of audio data, we need to 
    // find the previous frame start point (essentially flooring to
    // the closest multiple of framestep (default 128) and



    if (analysis_range_start > audioconf.frame_length_samples - audioconf.frame_step_samples) 
    {
	// if we are not dealing with the first bits of the file, 
	// take into account the frame overlap (ie. include a bit 
	// from previous package):
	
	analysis_range_start -= 
	    Math.floor( audioconf.frame_length_samples / 
			audioconf.frame_step_samples ) * audioconf.frame_step_samples; 
    }

    // and floor the end to the closesti multiple of framestep:
    // Except if we are dealing with the last packet, we should instead extend the
    // buffer so the last bits of audio signal will be analysed and 
    // fill the buffer with tiny noise for that; Well, we don't seem to be doing it here now.
    
    var analysis_range_end= (userdata[user].currentword.bufferend - (userdata[user].currentword.bufferend % audioconf.frame_step_samples));
    var recog_range_end= userdata[user].currentword.bufferend;

    // Immediately update the range ends so things don't get called twice!

    userdata[user].currentword.sent_to_analysis=analysis_range_end;
    userdata[user].currentword.sent_to_recogniser = recog_range_end;


    var analysis_range_length = analysis_range_end - analysis_range_start;

    var analysis_start_frame =  (analysis_range_start/ audioconf.frame_step_samples);
    var analysis_end_frame = (analysis_range_end/ audioconf.frame_step_samples);
    var analysis_frame_length = (analysis_range_length / audioconf.frame_step_samples);
    
    var result_range_length = analysis_range_length - Math.floor(audioconf.frame_length_samples/
								 audioconf.frame_step_samples) * audioconf.frame_step_samples;
    
    var overlap_frames = Math.ceil((audioconf.frame_length_samples - audioconf.frame_step_samples)/ audioconf.frame_step_samples );
    
    userdata[user].currentword.featureend = analysis_end_frame;

    debugout("******** Sending to audio analysis: " + already_sent_to_analysis +"-"+userdata[user].currentword.bufferend +
	     " --> framed to " + analysis_range_start + 
	     " - " + analysis_range_end +
	     " (frames " +
	     (analysis_range_start/ audioconf.frame_step_samples) + "-" +
	     (analysis_range_end/ audioconf.frame_step_samples) + ")");
    
    debugout("******** Waiting in return: " + 
	     " --> framed to " + analysis_start_frame * audioconf.dimensions +
	     " - " + (analysis_end_frame-overlap_frames) * audioconf.dimensions +
	     " (frames " +
	     (analysis_start_frame) + "-" +
	     ((analysis_end_frame-overlap_frames) ) + ")");
    

    if (analysis_range_length > 0) {
    // Send data to the DNN feature extractor:
	var audio_analyser = require('./audio_analyser');
	
	audio_analyser.compute_features( audioconf,
					 userdata[user].audiobinarydata.slice(analysis_range_start,analysis_range_end), 
					 userdata[user].featuredata.slice( analysis_start_frame * audioconf.dimensions, 
									   (analysis_end_frame-overlap_frames) * audioconf.dimensions ),
					 user, 
					 userdata[user].currentword.id,
					 analysis_range_end);
    }
    else 
    {
	debugout("Audio analysis of length 0 requested ("+analysis_range_start+"-"+analysis_range_end+")... This is bad manners.");

    }
    if (recog_range_end-recog_range_start > 0) {
	// Send data to the recogniser processes:
	send_to_recogniser(user, already_sent_to_recogniser, recog_range_end  );
    }
    else
    {
	debugout("Sending to recogniser data of length 0 requested ("+recog_range_start+"-"+recog_range_end+")... This is bad manners.");
    }




    
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
    //userdata[user].recogniser.send_audio(pcmdata);
  
}




/* EVENTS */


process.on('user_event', function(user, wordid, eventname, eventdata) {

    debugout( 'EVENT: user '+user+' wordid '+wordid +" eventname "+eventname); 

    if (eventname == 'segmenter_loaded') {
	userdata[user].segmenter_loaded = true;
	userdata[user].currentword.reference = eventdata.word;
	initialisation_reply(user);
    }
    else if (eventname == 'segmenter_ready') 
    {
	userdata[user].segmenter_ready = true;
	userdata[user].currentword.reference = eventdata.word;	    
	word_select_reply(user);
	
    }
    else 
    {
	if (wordid != get_current_word_id(user)) {
	    debugout("this event is for a word that we are not processing at this time (which would be "+get_current_word_id(user)+")");
	}
	else
	{		    
	    if (eventname == 'lastPacketCheck' ) {
		checkLastPacket(user);	    
	    }
	    else if (eventname ==  'sendAudioForAnalysis' ) {
		syncAudioAnalysis(user);	    
	    }
	    else if (eventname ==  'mfccDone') {
		userdata[user].currentword.featuresdone[0] = Math.max( userdata[user].currentword.featuresdone[0], eventdata.packetcode );    
		check_feature_progress(user);
	    }
	    else if (eventname == 'lsfDone' ) {
		userdata[user].currentword.featuresdone[1] = Math.max( userdata[user].currentword.featuresdone[1], eventdata.packetcode );    
		check_feature_progress(user);
	    }
	    else if (eventname ==  'logF0Done') {
		userdata[user].currentword.featuresdone[2] = Math.max( userdata[user].currentword.featuresdone[2], eventdata.packetcode );    
		check_feature_progress(user);
	    }
	    else if (eventname == 'segmented' ) {
		if (segmentation.length > 0) {
		    
		    userdata[user].currentword.segmentation = userdata[user].segmentation_handler.segmentation_to_state_list(segmentation);
		    userdata[user].currentword.segmentation_complete = true;

		}
		else 
		{
		    console.log("SEGMENTATION FAILED!");
		    userdata[user].currentword.segmentation = null;	

		    userdata[user].currentword.segmentation_complete = true;
		    
		}
		    
		check_feature_progress(user);

	    }
	    else if (eventname ==  'segmentation_error') {
		userdata[user].currentword.segmentation = null;
		userdata[user].currentword.segmentation_complete = true;
		
		check_feature_progress(user);
	    }	
	    else if (eventname == 'classification_done') {
		userdata[user].currentword.phoneme_classes = eventdata.classification
		
		calc_score_and_send_reply(user);
	    }
	    else
	    {
		debugout("Don't know what to do with this event!");
	    }
	}
    }
});




function check_feature_progress(user) {


    // Check if we have all the classification features up to the buffer end:
    
    var maxpoint =  Math.min.apply (Math, userdata[user].currentword.featuresdone);	

    if (maxpoint < userdata[user].currentword.analysed )
    {
	// if not, wait...
	debugout("*** Waiting for more features: ("+ userdata[user].currentword.featuresdone.toString() +" / "+  
		 Math.min.apply (Math, userdata[user].featuresdone)   +
		 " segment: "+userdata[user].segmentation_complete + 
		 " recog: "+ userdata[user].recognition_complete +" ) ")
    }
    else {
	
	// Mark that we have done the analysis to this last known point:
	userdata[user].analysed = maxpoint;
    }

    if (maxpoint => userdata[user].currentword.bufferend) {

	// If we are at bufferend, check if it was the last packet:

	debugout("*** Data processed up to the bufferend, was it the last packet already? lastpacketnr: "+ userdata[user].currentword.lastpacketnr);

	if (userdata[user].currentword.lastpacketnr > -1) {
	    // Apparently we have the last packet already:
	    debugout("*** Last packet, here goes!" );
	    
	    if (userdata[user].currentword.segmentation_complete)  {
		
		if (userdata[user].currentword.state_statistics == null) {
		    
		    userdata[user].currentword.state_statistics = "Working...";

		    // We have last packet analysed and a segmentation ready, so let's
		    // calculate statistics and get classification results!
		    
		    userdata[user].segmentation_handler.calculate_statistics(
			userdata[user].currentword.reference,
			userdata[user].currentword.id,
			userdata[user].currentword.segmentation, 
			userdata[user].featuredata.slice(0, userdata[user].currentword.featurebufferend), 
			audioconf);
		}
	    }
	    
	}
	
    }    
    //userdata[user].featuresdone = [false,false,false];
}


function calc_score_and_send_reply(user) {

    debugout("HEAR HEAR; Let's return the results finally!");
    // Send a random number back, as we don't know of any better.
    wordscore =  Math.round(5.0*Math.random());
    
    userdata[user].lastPacketRes.end( JSON.stringify(
	{score: wordscore, 
	 recognised_word: userdata[user].currentword.recresult,
	 msg: "<br>All " + userdata[user].currentword.lastpacketnr +" packets received!"}) );
    
    
    logging.log_scoring({user: user,
			 packetcount: userdata[user].currentword.lastpacketnr,
			 word_id : userdata[user].currentword.id,
			 score: wordscore, 
			 reference : userdata[user].currentword.reference,			 
			 //segmentation: userdata[user].currentword.segmentation, 
			 classification: userdata[user].currentword.phoneme_classes 
			});
    
    clearUpload(user)
    
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

	   
	   
function get_next_word_id(user) {
    if (userdata[user].currentword == null) {
	return 1;
    }
    else {
	return userdata[user].currentword.id +1;
    }
}

function get_current_word_id(user) {
    return userdata[user].currentword.id;
}



