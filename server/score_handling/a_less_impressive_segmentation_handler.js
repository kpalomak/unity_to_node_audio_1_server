

var net = require('net');

var fs = require('fs');

var logging = require('../game_data_handling/logging.js');

var HOST = 'localhost'; // The remote host
var PORT = 50007;       // The same port as used by the server
var ack  = '1';

var payload_length = 270;
var pause_between_packets = 20;

var got_phone_index = -200;
var got_data_len = -300;
var got_data = -400;
var here_comes_answer = -500;

var conf = require('../config.js');

// constructor

function SegmentationHandler(user) {

    this.user = user;

    this.word = null;

    this.word_id = null;

    this.classifications = [];

    this.classifier_queue = [];

    this.classifier = null;

    this.connected;

    this.classified_count = 0;

    this.state = "waitforacc";

    debugout(this.user, "New segmentation handler started for user "+user);


    this.sizebuffer = new Buffer(4);
    this.sizebuffer.writeInt32LE(payload_length);

    this.data_to_send = null;


    SegmentationHandler.prototype.init_classification = function(word, word_id) {
	// placeholder for things to come:
	var dummy = 1;
    }
    
    SegmentationHandler.prototype.shell_segmentation_to_state_list = function(segmentation_string) {
	/* Input string like this:

	1408 2048 _-C+u.1 
	2048 2432 _-C+u.2 
	2432 8832 C-u+z.0 
	8832 9344 C-u+z.1 
	9344 9472 C-u+z.2 
	9472 11648 u-z+_.0 
	11648 12544 u-z+_.1 
	12544 13952 u-z+_.2 
	

	and output:
	[ [state0start,state0end], [state1start,state1end],... ]
	*/

	if (segmentation_string != null) {

	    
	    var segmentation_array = [];   
	    var ct = 0;
	    var states = [];

	    /* This is some heavy kludging to use the Aalto ASR server segmentation
	       which seems to give the segmentation in a pretty sneaky format;
	    */

	    var startframe=0;
	    
	    segmentation_array = [];

	    var state = 458;
	    var start = 0;

	    segmentation_string.toString().split("\n").forEach( function(line, index) {
		
		begin_end_and_model = line.split(" ");

		start = begin_end_and_model[0];
		end = begin_end_and_model[1]-1;
		length = Math.round((end-start)/conf.audioconf.frame_step_samples) + " frames"
		state = begin_end_and_model[2]
		
		states.push({ 'state':state, 'start':start, 'end': end , 'length': length  })
		
		if ( (index+1) %3 == 0) {		    
		    segmentation_array.push( states );
		    states = [];
		}


	    });


	    debugout(this.user + ": Setting the classification array length to: "+segmentation_array.length)
	    this.classifications = new Array(segmentation_array.length);

	    return segmentation_array;
	}

	else return [];
    }


    SegmentationHandler.prototype.segmentation_to_state_list = function(segmentation_string) {
	// Input string like this:
	// "1:459;37:460;41:30;51:32;55:36;58:1325;95:1334;98:1347;102:1431;115:1448;120:1463;123:458;"
	// and output:
	// [ [state0start,state0end], [state1start,state1end],... ]

	if (segmentation_string != null) {

	    
	    var segmentation_array = [];   
	    var ct = 0;
	    var states = [];

	    /* This is some heavy kludging to use the Aalto ASR server segmentation
	       which seems to give the segmentation in a pretty sneaky format;
	    */

	    var startframe=0;
	    
	    segmentation_array = [];

	    var state = 458;
	    var start = 0;

	    segmentation_string.split(";").forEach( function(line, index) {
		
		border_and_state = line.split(":");

		end = border_and_state[0]-1;

		if (state != 458 && state != 459 && state != 460) {
		    states.push({ 'state':state, 'start':start, 'end': end  })

		    if ( (index+1) %3 == 0) {
			segmentation_array.push( states );
			states = [];
		    }
		}

		start = border_and_state[0];

		state = border_and_state[1];

	    });


	    debugout(this.user + ": Setting the classification array length to: "+segmentation_array.length)
	    this.classifications = new Array(segmentation_array.length);

	    return segmentation_array;
	}

	else return [];
    }

    get_zero_array = function(dim) {

	// from: 
	// http://stackoverflow.com/questions/1295584/most-efficient-way-to-create-a-zero-filled-javascript-array

	return Array.apply(null, Array( dim  )).map(Number.prototype.valueOf,0);
    }



/*    get_classification = function(data1,data2,data3) {

	// Hastily copied from a test script, this could be so much better...

	// Schedule for rewriting when I have some extra time and energy. Maybe 2023?


	var state = "start";

	var sizebuffer = new Buffer(4);
	sizebuffer.writeInt32LE(payload.length);

	var returnsizebuffer = new Buffer(4);

	var payloadbuffer = Buffer.concat([data1, data2, data3]);

	completedata='';

	var client = net.connect({port: PORT},
				 function() { //'connect' listener
				     debugout('connected to server!');
				     client.write( sizebuffer );
				     state ="waitforacc";
				 });

	client.on('data', function(data) {
	    debugout("Got "+Object.prototype.toString.call(data)+" of length "+ data.length+" in state "+state);
	    if (state == "waitforacc") {
		debugout("Got ack: "+data.toString());
		client.write( payloadbuffer );
		state = "waitforreturnlen";
	    }
	    else if (state == "waitforreturnlen") {
		var returnsizebuffer = new Buffer( new Uint8Array(data) );
		debugout("Got data length: "+ returnsizebuffer.readInt32LE(0,4));
		client.write( ack );
		state = "waitforreturndata";
	    }
	    else if (state == "waitforreturndata") {
		// From http://stackoverflow.com/questions/8609289/
		// convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
		var returneddata = new Buffer( new Uint8Array(data) );

		debugout("Got returned data: ");
		for (var i =0; i< returneddata.length; i+=4) {
		    debugout(returneddata.readFloatLE(i));
		}
		
		state = "done"; 
		client.end();
		
	    }
	});
	client.on('end', function() {
	    debugout('disconnected from server');
	});


    }
*/

}




var debugout = function(user, msg) {
    console.log("\x1b[34msegmen %s\x1b[0m",logging.get_date_time().datetime + ' '+ user+ ': '+msg);
}


module.exports = SegmentationHandler;

