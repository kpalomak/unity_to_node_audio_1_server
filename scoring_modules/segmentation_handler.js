

var net = require('net');

var fs = require('fs');

var HOST = 'localhost'; // The remote host
var PORT = 50007;       // The same port as used by the server
var ack  = '1';

var payload_length = 270;
var pause_between_packets = 20;

var got_phone_index = -200;
var got_data_len = -300;
var got_data = -400;
var here_comes_answer = -500;

// constructor

function SegmentationHandler(user) {

    this.user = user;

    this.classifications = [];

    this.classifier_queue = [];

    this.classifier = null;

    this.connected;

    this.classified_count = 0;

    this.state = "waitforacc";

    console.log("NEW CLASSIFIER INSTANCE  <---------------- Look at this! -----------------------");


    this.sizebuffer = new Buffer(4);
    this.sizebuffer.writeInt32LE(payload_length);

    this.data_to_send = null;


    // Piece of code to handle the theano NN-classifier running
    // on some port somewhere

    SegmentationHandler.prototype.init_classification = function (phonecount) {

	this.classifications = new Array(phonecount);
	

	this.classified_count = 0;

	this.state = "waitforacc";

	
	this.classifier = net.connect({port: PORT},
				      function() { //'connect' listener
					  console.log('connected to server!');
					  that.connected = true;

					  that.state ="ready_to_send";
				      });

	var that = this;

	console.log("INITIALISING CLASSIFIER <---------------- Look at this! -----------------------");
	this.classifier.on('data', function(data) {
	    console.log("Got "+Object.prototype.toString.call(data)+" of length "+ data.length+" in state "+that.state);

	    var returneddata = new Buffer( new Int32Array(data) );
	    var msg = returneddata.readIntLE(0);
	    console.log("Got message: " + msg);

	    if (msg == got_phone_index || msg == 56) {
		that.classifier.write( that.sizebuffer );
	    }
	    else if (msg == got_data_len || msg == 211) {
		that.classifier.write( that.data_to_send.payload );
	    }
	    else if (msg == got_data || msg == 112) {
		console.log("Python accepted data. We're happy and remove the phone data from queue.")

		index_and_payload = that.classifier_queue.splice(0,1)[0];
	    }
	    else if (msg == here_comes_answer || msg == 12) {

		phone_index=returneddata.readIntLE(4);
		phone_class= returneddata.readIntLE(8);

		console.log("Got classification: phone "+phone_index + " class "+phone_class );
		
		that.classifications[ phone_index  ] = phone_class;

		that.classified_count += 1;

		if (that.classified_count == that.classifications.length )
		{
		    console.log("We're done with this word!");

		    that.state = "done"; 
		    that.classifier.end();            
		}
		else 
		{
		    console.log("Let's get ready for next word!");

		    that.state = "ready_to_send";
		    that.process_classifier_queue;
		}		
		
	    }
	});
	this.classifier.on('end', function() {
	    console.log('disconnected from server');
	});

    }


    SegmentationHandler.prototype.send_to_classifier = function (phoneindex, payloadbuffer) {

	var indexbuffer = new Buffer( 4 );
	indexbuffer.writeInt32LE( phoneindex );
	
	this.classifier_queue.push({'index': indexbuffer, 'payload':payloadbuffer});

	this.process_classifier_queue();
    }


    SegmentationHandler.prototype.process_classifier_queue = function() {
	if (this.connected && this.state != 'done') {
	    if (this.state == "ready_to_send")  {
		if (this.classifier_queue.length > 0) {
		    //console.log("???????????? Packets in queue, let's send");
		    this.state = "sending";
		    this.data_to_send = this.classifier_queue[0];
		    this.classifier.write( this.data_to_send.index );
		}
	    }
	    else if (this.state == "sending") {
		console.log("SegmentationHandler.processs_classifier not ready to send! (state="+this.state+")");
		var that = this;	
		setTimeout (function() {
		    that.process_classifier_queue();
		}, pause_between_packets);
	    }
	}
	else {
	    console.log("Segmenter not connected yet! (state="+this.state+")");
	}
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


	    return segmentation_array;
	}

	else return [];
    }

    compute_delta = function(prev2, prev1, current, next1, next2) {

	// calculate deltas with N=2:
	// d_t = sum {n=1 to N}{ n * ( c_{t+n} - c_{t-n} } / (2 * sum {n=1 to N} { n ^ 2 }) 

	low = -10000;

	if (prev2 > low &&  prev1 > low &&  current > low && next1 > low &&  next2 > low) 
	{
	    return ( 2*(next2-prev2) + 1*(next1-prev1) ) / ( 2 * ( 1*1 + 2*2));
	}
	else 
	{
	    return low;
	}
    }



    SegmentationHandler.prototype.calculate_statistics = function(segmentation_array, features, conf) {
	
	var statistics_array = [];

	var dim = conf.dimensions;


	var deltas = Buffer(features.length);

	for (var frame = 2; frame < (features.length/4/dim)-3; frame++) {
	    for (var i = frame*(dim*4); i < (frame+1)*(dim*4); i+=4) {
		//console.log("Frame "+ frame +" computing deltas from indexes " + (i-2*dim*4) +","+(i-dim*4)+","+(i)+","+(i+dim*4)+","+(i+2*dim*4)+" (max: "+features.length+")");

		//if (i+2*dim*4 <= features.length) {
		//console.log( "This goes too far (even though frame ("+frame +") < (features.length/4/dim)-3 ("+ ((features.length/4/dim)-3)+")" );
		//break;
		//}

		/*	    var float1=features.readFloatLE(i-2*dim*4);
			    var float2=features.readFloatLE(i-dim*4);
			    var float3=features.readFloatLE(i);
			    var float4=features.readFloatLE(i+dim*4);
			    var float5=features.readFloatLE(i+2*dim*4);
			    
			    var delta= compute_delta(float1,float2,float3,float4,float5);

			    console.log("Writing to deltas "+delta+" at index:"+i+" of max. "+deltas.length );
			    
			    deltas.writeFloatLE(delta, i);*/
		

		deltas.writeFloatLE( compute_delta(features.readFloatLE(i-2*dim*4),
						   features.readFloatLE(i-dim*4),
						   features.readFloatLE(i),
						   features.readFloatLE(i+dim*4),
						   features.readFloatLE(i+2*dim*4)
						  ), i);
	    }
	}
	



	var deltadeltas = Buffer(features.length);

	for (var frame = 3; frame < (deltas.length/4/dim)-3; frame++) {
	    for (var i = frame*(dim*4); i < (frame+1)*(dim*4); i+=4) {
		deltadeltas.writeFloatLE( compute_delta(deltas.readFloatLE(i-2*dim*4),
				 			deltas.readFloatLE(i-dim*4),
							deltas.readFloatLE(i),
							deltas.readFloatLE(i+dim*4),
							deltas.readFloatLE(i+2*dim*4)
						       ),
					  i);
	    }
	}


	
	
	if (segmentation_array != null && segmentation_array.length > 0) {

	    classifications = new Array(segmentation_array.length);
	    
	    console.log("segmentation_array:");
	    console.log(segmentation_array);

	    var that = this;

	    segmentation_array.forEach( function( borders, phoneindex ) {

		var state1 = calculate_state_statistics( borders.start, borders.end, features, deltas, deltadeltas, conf );
		var state2 = calculate_state_statistics( borders.start, borders.end, features, deltas, deltadeltas, conf );
		var state3 = calculate_state_statistics( borders.start, borders.end, features, deltas, deltadeltas, conf );

		// Send the state statistics to DNN for classification and return the result:

		that.send_to_classifier(phoneindex, Buffer.concat([state1,state2,state3]));

		//classifications[phoneindex] = get_classification(state1, state2, state3);

	    });
	}
    }

    calculate_state_statistics = function(startframe, endframe, features, deltas, deltadeltas, conf) {
	

	var averages = get_zero_array(conf.dimensions * 3);
	var counts = get_zero_array(conf.dimensions * 3);

	var dim = conf.dimensions;

	var feat = 0;
	var delta = 0;
	var deltadelta = 0;

	for (var frame = startframe; frame < endframe; frame++) 
	{	
	    //for (var i = frame*(dim*4); i < (frame+1)*(dim*4); i+=4) {
	    for (var i = 0; i < dim; i++) 
	    {
		floatindex = frame*(dim*4)+(i*4);	    
		
		feat = features.readFloatLE(floatindex);
		if (feat > low) {
		    averages[i]+=feat;
		    counts[i]++;
		}

		delta = deltas.readFloatLE(floatindex);
		if (delta > low) {
		    averages[i+dim]+=feat;
		    counts[i+dim]++;
		}	    

		deltadelta = deltadeltas.readFloatLE(floatindex);
		if (deltadelta > low) {
		    averages[i+(2*dim)]+=feat;
		    counts[i+(2*dim)]++;
		}	    
		
	    }
	    
	}

	averagebuffer= new Buffer(4*averages.length);

	for (var i = 0; i < 3 *dim; i++) 
	{
	    if (counts[i] > 0) {
		averagebuffer.writeFloatLE(i*4, averages[i]/counts[i]);
	    }
	    else
	    {
		averagebuffer.writeFloatLE(i*4, 0);
	    }
	}

	return averagebuffer;
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
				     console.log('connected to server!');
				     client.write( sizebuffer );
				     state ="waitforacc";
				 });

	client.on('data', function(data) {
	    console.log("Got "+Object.prototype.toString.call(data)+" of length "+ data.length+" in state "+state);
	    if (state == "waitforacc") {
		console.log("Got ack: "+data.toString());
		client.write( payloadbuffer );
		state = "waitforreturnlen";
	    }
	    else if (state == "waitforreturnlen") {
		var returnsizebuffer = new Buffer( new Uint8Array(data) );
		console.log("Got data length: "+ returnsizebuffer.readInt32LE(0,4));
		client.write( ack );
		state = "waitforreturndata";
	    }
	    else if (state == "waitforreturndata") {
		// From http://stackoverflow.com/questions/8609289/
		// convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
		var returneddata = new Buffer( new Uint8Array(data) );

		console.log("Got returned data: ");
		for (var i =0; i< returneddata.length; i+=4) {
		    console.log(returneddata.readFloatLE(i));
		}
		
		state = "done"; 
		client.end();
		
	    }
	});
	client.on('end', function() {
	    console.log('disconnected from server');
	});


    }
*/

}


module.exports = SegmentationHandler;

