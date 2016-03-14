

var fs = require('fs');

var endtag='\x0d\x0a';

var net = require('net');

var HOST = '127.0.0.1';
var PORT = 7554;

var events = require('events');


//var RecogniserClient = (function () {

// constructor:
function RecogniserClient (conf, user, segmentword) {//(conf, user, segmentword) {
    
    console.log("Initialising: "+conf+", "+user+", "+segmentword);

    this.recog_result = null;
    this.client = null;    
    this.connected = false;       
    this.state = 'init';
    this.audio_queue = [];
    
    this.sending_data = false;	
    this.word_to_be_segmented = null;	
    
    this.eventEmitter = new events.EventEmitter();	
    
    this.user = user;
    this.recog_conf = conf;
    this.word_to_be_segmented = segmentword;

    this.client = new net.Socket();

    
    var that = this;

    this.eventEmitter.on('audio_packages_sent', function () { 
	that.process_audio_queue();
    });

    this.client.connect(PORT, HOST, function() {	
	console.log('CONNECTED TO: ' + HOST + ':' + PORT + " --> " + that.client.address().port);
	// Write a message to the socket as soon as the client is connected:
	that.connected = true;
	that.state='init';
	//console.log(this);
	that.define_speaker(that,that.user, that.word_to_be_segmented);
	
    });
    
    // Add a 'data' event handler for the client socket
    // data is what the server sent to this socket
    
    
    this.client.on('data', function(data) {
	console.log("Got data from port "+ that.client.address().port +"! >>>"+data+"<<<");
	//console.log("Got data! My state is "+ that.state +" and my word is "+ that.word_to_be_segmented+": "+data);
	
	if (data.toString().substr(0,23) == '0000000000000000027 200') {

	    //console.log('recogniser says OK (my state is '+state+')');
	    
	    if (that.state == 'init') {
		console.log(' --> grammar_def');		
		that.state = 'grammar-def';
		that.define_grammar(that.recog_conf.grammar);
	    }

	    else if (that.state == 'grammar-def') {		
		if (that.word_to_be_segmented != null) {
		    console.log(' --> define_word');
		    that.state = 'word-def';
		    that.define_word("choose");	

		}
		else {
		    console.log(' --> start_recog');
		    that.state = 'start_recog';
		    that.start_recog();
		}
	    }

	    else if (that.state == 'word-def') {
		console.log(' --> let\s go segment!');
		that.state = 'segment';
		process.emit('segmenter_ready', that.user, that.word_to_be_segmented);
		//initcallback(res);
	    }
	    else if (that.state == 'start_recog') {
		console.log(' --> let\'s go recognise!');
		that.state = 'recognise';
		process.emit('recogniser_ready', that.user);

		//initcallback(res);
	    }
	}
	else if (data.toString().indexOf('RECOGNITION-COMPLETE') > -1) {
	    that.state = 'got_result';
	    arr =  data.toString().split("\n");
	    if (arr[1].substr(0,20) == 'Completion-Cause:000') {
		/*this.*/word = arr[4];
		console.log("### Recognised \""+word+"\" ###");
		process.emit('recognised',that.user, word);
	    }
	    else {
		console.log("Something went wrong: \n"+data);
		process.emit('recognition_error',that.user, null);

	    }
	    that.client.pause();
	    //that.state = 'start_recog';
	    //that.start_recog();	   
	}

	else if (data.toString().indexOf('SEGMENTATION-COMPLETE') > -1) {
	    that.state = 'got_segmentation';
	    arr =  data.toString().split("\n");
	    if (arr[1].substr(0,20) == 'Completion-Cause:000') {
		/*this.*/segmentation = arr[4];
		console.log("### Segmented \""+segmentation+"\" ###");
		process.emit('segmented',that.user, that.word_to_be_segmented, segmentation);
	    }
	    else {
		console.log("Something went wrong: \n"+data);
		process.emit('segmentation_error',that.user, that.word_to_be_segmented, null);
	    }
	    that.client.pause();
	    //that.state = 'word-def';
	    //that.define_word("choose");
	}

	else { console.log("Does not fit this:>>\n"+data+"\n<<");} 



	// Close the client socket completely
	//client.destroy();	
    });
    
    this.client.on('error', function (err) {
	console.log(err.stack);
    });

    // Add a 'close' event handler for the client socket
    this.client.on('close', function() {
	console.log('Connection closed');
    });
    





    function mrcp_message(command, headers, data) {
	
	var msg=' ' + command + endtag;

	headers.forEach( function (item) {
	    msg += item.name +":"+item.value+endtag;
	});
	msg += endtag;
	
	if (data) {
	    msglength=msg.length+data.length+10;
	} 
	else {
	    msglength=msg.length+10;
	}
	
	msgpad=0;
	for (var n =9-(msglength.toString().length); n > 0; n--){
	    msgpad += '0';
	}
	
	
	msg=msgpad+(msglength) + msg;
	//console.log("========== msg to recogniser ==========");
	//console.log(msg);
	//console.log("==========/msg to recogniser ==========");
	//console.log("msg to recog: >"+msg+"<");

	
	return msg;
    }

    RecogniserClient.prototype.define_grammar = function (grammar) {
	this.client.write(
	    mrcp_message( 
		'DEFINE-GRAMMAR',
		[{'name':'Content-Location',
		  'value': 'words.conf'}],
		null ),	    
	    function(err) {
		if (err) {
		    console.log(err.stack);
		}
		else {
		    dummy = 1;

		}
	    });	
    }


    RecogniserClient.prototype.define_word = function (word) {
	console.log("===================================> Trying to define current word as "+word);
	if (this.connected) {
	    this.client.write( 
		mrcp_message (
		    'SEGMENT',
		    [{'name': 'Reference-Transcript',
		      'value' : word }],
		    null ), 
		function (err) {
		    if (err) {
			console.log(err.stack);
		    }			    
		});	
	}
	else {
	    console.log("Recogniser not connected yet! (word="+this.word_to_be_segmented+" state="+this.state+")");
	}
    }


    RecogniserClient.prototype.define_speaker = function (speaker, word) {
	//console.log(speaker);
	//function define_speaker(speaker) {
	console.log("=========> Trying to define current speaker as "+speaker +" (my word is "+word+")");
	if (this.connected) {
	    this.client.write( 
		mrcp_message (
		    'SET-PARAMS',
		    [{'name': 'Voice-Name',
		      'value' : speaker }
		    ],
		    null ), 
		function (err) {
		    if (err) {
			console.log(err.stack);
		    }			    
		});	
	}
	else {
	    console.log("Recogniser not connected yet! (word="+word_to_be_segmented+" state="+this.state+")");
	}
    }


    

    RecogniserClient.prototype.start_recog = function() {
	if (this.connected) {
	    this.client.write( 
		mrcp_message (
		    'RECOGNIZE',
		    [{'name': 'Confidence-Threshold',
		      'value' : '0.0' }],
		    null ), 
		function (err) {
		    if (err) {
			console.log(err.stack);
		    }			    
		});	
	}
	else {
	    console.log("Recogniser not connected yet! (word="+this.word_to_be_segmented+" state="+this.state+")");
	}
    }
    
    RecogniserClient.prototype.whats_my_word = function() {
	return this.word_to_be_segmented;
    }




    RecogniserClient.prototype.finish_audio = function() {
	//this.send_audio(new Buffer(0));
	this.audio_queue.push(new Buffer(0));
	this.process_audio_queue();

    }



    RecogniserClient.prototype.send_audio = function(data) {
	this.audio_queue.push(data);
	this.process_audio_queue();
    }


    RecogniserClient.prototype.process_audio_queue = function() {
	if (this.connected) {
	    if (this.sending_data == false) {
		//console.log("???????????? Data sending free to use!");
		if (this.audio_queue.length > 0) {
		    //console.log("???????????? Packets in queue, let's send");
		    this.sending_data=true;
		    data_package = this.audio_queue.splice(0,1)
		    this.send_audio_packets(data_package[0], 0, 0);
		}
	    }
	    else {
	        console.log("???????????? word "+this.word_to_be_segmented+" Data sending in progress, let's wait "+ this.recog_conf.pause_between_packets+" ms and try again");
		var that = this;	
		setTimeout (function() {
		    that.process_audio_queue();
		}, that.recog_conf.pause_between_packets);
	    }
	}
	else {
	    console.log("Recogniser not connected yet! (word="+that.word_to_be_segmented+" state="+that.state+")");
	}
    }




    RecogniserClient.prototype.send_audio_packets = function(data, i, queue_index) {

	var current_port = this.client.address().port;

	//console.log((data.length-i));
	//console.log(recog_conf.packet_size);
	//console.log(Math.min( (data.length-i), recog_conf.packet_size));  
	if (data.length==0)
	{
	    console.log(current_port + " ###################### FINISHING AUDIO!!!! My word is "+this.word_to_be_segmented );
	}

	this_packet_size = Math.min( (data.length-i), this.recog_conf.packet_size);    

	console.log(current_port + " Sending "+data.length+" bytes of data: Word is set to "+this.word_to_be_segmented);
	//if (this_packet_size == 0) {
	//	console.log("###################### SIZE 0 PACKET SENT!!!! ###########################");
	//}

	var that = this;
	this.client.write(
	    mrcp_message (
		'AUDIO',
		[{ 'name' : 'Content-Length',
		   'value' : this_packet_size }],
		data.slice(i, i+this_packet_size ) ),
	    function (err) {
		//console.log("??????????????? wrote to msg queue, now what? (i="+i+")");
		if (err) {
		    //console.log("??????????????? we have error 1: "+err);
		    console.log(err.stack);
		} 
		else 
		{
		    //console.log("????? Writing to recogniser "+i+"-"+(i+this_packet_size));
		    //console.log("data.slice("+i+", "+(i+this_packet_size)+")" );
		    //console.log(data.slice(i, i+this_packet_size));
		    if (this_packet_size > 0) {
			that.client.write( data.slice(i, i+this_packet_size), function (err) {
			    //console.log("??????????????? wrote to msg queue, now what?");

			    if (err) {		
				//console.log("??????????????? we have error 2: "+err);
				console.log(err.stack);
			    } else {
				if (i+this_packet_size < data.length)
				{
				    i+=that.recog_conf.packet_size;
				    //console.log("??????????????? calling myself at "+i);
				    setTimeout (function() {
					that.send_audio_packets(data,i, queue_index);
				    }, that.recog_conf.pause_between_packets);
				}
				else {
				    //console.log("??????????????? !"+(i+this_packet_size)+" < "+data.length);
				    that.sending_data = false;
				    that.eventEmitter.emit('audio_packages_sent');
				}
			    }
			});
		    }
		    else {
			// Done! This was the last packet.
			that.sending_data = false;		    
		    }
		}
	    });	 
    }




    RecogniserClient.prototype.reset_recogniser = function() {
	this.state = 'start_recog';
	this.start_recog();
	
    }
}


module.exports = RecogniserClient;
			/* = { 
			   RecogniserClient : RecogniserClient,
			   //init : init,  
			   define_grammar: define_grammar,
			   define_word : define_word,
			   define_speaker : define_speaker,
			   start_recog : start_recog,
			   send_audio : send_audio,
			   finish_audio : finish_audio,
			   reset_recogniser: reset_recogniser
			   //get_result : get_result
};
*/
