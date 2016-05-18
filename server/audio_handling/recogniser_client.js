

var fs = require('fs');
var logging = require('../game_data_handling/logging.js');

var endtag='\x0d\x0a';

var net = require('net');

var HOST = '127.0.0.1';
var PORT = 7554;

var events = require('events');


//var recogniser_client = (function () {

// constructor:
function recogniser_client (conf, user, segmentword) {//(conf, user, segmentword) {
    

    this.recog_result = null;
    this.client = null;    
    this.connected = false;       
    this.state = 'init';
    this.audio_queue = [];
    
    this.sending_data = false;	
    this.word_to_be_segmented = null;	
    this.word_id = 13;

    this.eventEmitter = new events.EventEmitter();	
    
    this.user = user;
    this.recog_conf = conf;
    this.word_to_be_segmented = segmentword;

    this.client = new net.Socket();

    debugout(this.user, "Initialising: "+conf+", "+user+", "+segmentword);
    this.client_type = 'initialising';

    var that = this;

    this.eventEmitter.on('audio_packages_sent', function () { 
	that.process_audio_queue();
    });

    this.client.connect(PORT, HOST, function() {	
	debugout(that.user, 'CONNECTED TO: ' + HOST + ':' + PORT + " --> " + that.client.address().port);
	// Write a message to the socket as soon as the client is connected:
	that.connected = true;
	that.state='init';
	//debugout(this);
	that.define_speaker(that.user, that.word_to_be_segmented);
	
    });
    
    // Add a 'data' event handler for the client socket
    // data is what the server sent to this socket
    
    
    this.client.on('data', function(data) {
	debugout(that.user, "Got data from port "+ that.client.address().port +" ("+that.client_type+"):")
	debugout(that.user, (data.toString().split('\n')[0]));
	//debugout("Got data! My state is "+ that.state +" and my word is "+ that.word_to_be_segmented+": "+data);
	
	if (data.toString().substr(0,23) == '0000000000000000027 200') {

	    //debugout('recogniser says OK (my state is '+state+')');
	    
	    if (that.state == 'init') {
		debugout(that.user, ' --> grammar_def');		
		that.state = 'grammar-def';
		that.define_grammar(that.recog_conf.grammar);
	    }

	    else if (that.state == 'grammar-def') {		
		if (that.word_to_be_segmented != null) {
		    process.emit('user_event', that.user, that.word_id, 'segmenter_loaded', {word:that.word_to_be_segmented});
		    debugout(that.user, ' --> Next we want to define_word');
		    that.state = 'segmenter_loaded';
		}
		else {
		    debugout(that.user, ' --> Next we want to start_recog');
		    process.emit('user_event', that.user, that.word_id, 'recogniser_loaded',{word:that.word_to_be_segmented});
		    that.state = 'recog_loaded';
		}
	    }

	    else if (that.state == 'word-def') {
		debugout(that.user, ' --> let\s go segment!');
		that.state = 'segment';
		process.emit('user_event', that.user, that.word_id, 'segmenter_ready',{word:that.word_to_be_segmented});
		//initcallback(res);
	    }
	    else if (that.state == 'start_recog') {
		debugout(that.user, ' --> let\'s go recognise!');
		that.state = 'recognise';
		process.emit('user_event', that.user, that.word_id, 'recogniser_ready',{word:that.word_to_be_segmented});

		//initcallback(res);
	    }
	}
	else if (data.toString().indexOf('RECOGNITION-COMPLETE') > -1) {
	    that.state = 'got_result';
	    arr =  data.toString().split("\n");
	    if (arr[1].substr(0,20) == 'Completion-Cause:000') {
		/*this.*/word = arr[4];
		debugout(that.user, "### Recognised \""+word+"\" ###");
		process.emit('user_event', that.user, that.word_id, 'recognised',{word:that.word_to_be_segmented});
	    }
	    else {
		debugout(that.user, "Something went wrong: \n"+data);
		process.emit('user_event', that.user, that.word_id, 'recognition_error',{word:that.word_to_be_segmented});

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
		debugout(that.user, "### Segmented \""+segmentation+"\" ###");
		process.emit('user_event', that.user, that.word_id, 'segmented',{word:that.word_to_be_segmented});
	    }
	    else {
		debugout(that.user, "Something went wrong: \n"+data);
		process.emit('user_event', that.user, that.word_id, 'segmentation_error',{word:that.word_to_be_segmented});
	    }
	    that.client.pause();
	    //that.state = 'word-def';
	    //that.define_word("choose");
	}

	else { debugout(that.user, "Does not fit this:>>\n"+data+"\n<<");} 



	// Close the client socket completely
	//client.destroy();	
    });
    
    this.client.on('error', function (err) {
	debugout(this.user, err.stack);
    });

    // Add a 'close' event handler for the client socket
    this.client.on('close', function() {
	debugout(this.user,'Connection closed');
    });
    
    
    recogniser_client.prototype.init_recog = function () {
	debugout(this.user,"************************************************************************ start_recog!");

	this.state = 'start_recog';
	this.client_type = 'recogniser';
	this.start_recog();	
    }


       
    recogniser_client.prototype.init_segmenter = function (word, word_id) {
	debugout(this.user,"************************************************************************ start_segment!");
	this.word_to_be_segmented = word;
	this.word_id = word_id;
	this.state = 'word-def';
	this.client_type = 'segmenter';

	this.define_word(word);	
    } 



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
	//debugout("========== msg to recogniser ==========");
	//debugout(msg);
	//debugout("==========/msg to recogniser ==========");
	//debugout("msg to recog: >"+msg+"<");

	
	return msg;
    }




    recogniser_client.prototype.define_grammar = function (grammar) {
	this.client.write(
	    mrcp_message( 
		'DEFINE-GRAMMAR',
		[{'name':'Content-Location',
		  'value': 'words.conf'}],
		null ),	    
	    function(err) {
		if (err) {
		    debugout(this.user,err.stack);
		}
		else {
		    dummy = 1;

		}
	    });	
    }


    recogniser_client.prototype.define_word = function (word) {

	debugout(this.user," =================> Trying to define current word as "+word);

	var current_port = this.client.address().port;
	
	debugout(this.user,current_port + " ("+this.client_type+") =================> Trying to define current word as "+word + " (word_id "+this.word_id+")");
	if (this.connected) {
	    this.client.write( 
		mrcp_message (
		    'SEGMENT',
		    [{'name': 'Reference-Transcript',
		      'value' : word }],
		    null ), 
		function (err) {
		    if (err) {
			debugout(this.user,err.stack);
		    }			    
		});	
	}
	else {
	    debugout(this.user,"Recogniser not connected yet! (word="+this.word_to_be_segmented+" state="+this.state+")");
	}
    }


    recogniser_client.prototype.define_speaker = function (speaker, word) {
	//debugout(speaker);
	//function define_speaker(speaker) {
	debugout(this.user,"=========> Trying to define current speaker as "+speaker +" (my word is "+word+")");
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
			debugout(this.user,err.stack);
		    }			    
		});	
	}
	else {
	    debugout(this.user,"Recogniser not connected yet! (word="+word_to_be_segmented+" state="+this.state+")");
	}
    }


    

    recogniser_client.prototype.start_recog = function() {
	debugout(this.user,"Starting recog, are we here ever?");
	if (this.connected) {
	    this.client.write( 
		mrcp_message (
		    'RECOGNIZE',
		    [{'name': 'Confidence-Threshold',
		      'value' : '0.0' }],
		    null ), 
		function (err) {
		    if (err) {
			debugout(this.user,err.stack);
		    }			    
		});	
	}
	else {
	    debugout(this.user,"Recogniser not connected yet! (word="+this.word_to_be_segmented+" state="+this.state+")");
	}
    }
    
    recogniser_client.prototype.whats_my_word = function() {
	return this.word_to_be_segmented;
    }

    recogniser_client.prototype.whats_my_word_id = function() {
	return this.word_id;
    }




    recogniser_client.prototype.finish_audio = function() {
	//this.send_audio(new Buffer(0));
	this.audio_queue.push(new Buffer(0));
	this.process_audio_queue();

    }



    recogniser_client.prototype.send_audio = function(data) {
	this.audio_queue.push(data);
	this.process_audio_queue();
    }


    recogniser_client.prototype.process_audio_queue = function() {
	if (this.connected) {
	    if (this.sending_data == false) {
		//debugout("???????????? Data sending free to use!");
		if (this.audio_queue.length > 0) {
		    //debugout("???????????? Packets in queue, let's send");
		    this.sending_data=true;
		    data_package = this.audio_queue.splice(0,1)
		    this.send_audio_packets(data_package[0], 0, 0);
		}
	    }
	    else {
	        //debugout(this.user,"???????????? word "+this.word_to_be_segmented+" Data sending in progress, let's wait "+ this.recog_conf.pause_between_packets+" ms and try again");
		var that = this;	
		setTimeout (function() {
		    that.process_audio_queue();
		}, that.recog_conf.pause_between_packets);
	    }
	}
	else {
	    debugout(this.user,"Recogniser not connected yet! (word="+that.word_to_be_segmented+" state="+that.state+")");
	}
    }




    recogniser_client.prototype.send_audio_packets = function(data, i, queue_index) {

	var current_port = this.client.address().port;

	//debugout((data.length-i));
	//debugout(recog_conf.packet_size);
	//debugout(Math.min( (data.length-i), recog_conf.packet_size));  
	if (data.length==0)
	{
	    debugout(this.user,current_port + " ##### FINISHING AUDIO!!!! ("+this.client_type+") My word is "+this.word_to_be_segmented );
	}

	this_packet_size = Math.min( (data.length-i), this.recog_conf.packet_size);    

	//debugout(this.user,current_port + "("+this.client_type+") Sending "+data.length+" bytes of data: Word is set to "+this.word_to_be_segmented);

	var that = this;
	this.client.write(
	    mrcp_message (
		'AUDIO',
		[{ 'name' : 'Content-Length',
		   'value' : this_packet_size }],
		data.slice(i, i+this_packet_size ) ),
	    function (err) {
		//debugout("??????????????? wrote to msg queue, now what? (i="+i+")");
		if (err) {
		    //debugout("??????????????? we have error 1: "+err);
		    debugout(that.user, err.stack);
		} 
		else 
		{
		    //debugout("????? Writing to recogniser "+i+"-"+(i+this_packet_size));
		    //debugout("data.slice("+i+", "+(i+this_packet_size)+")" );
		    //debugout(data.slice(i, i+this_packet_size));
		    if (this_packet_size > 0) {
			that.client.write( data.slice(i, i+this_packet_size), function (err) {
			    //debugout("??????????????? wrote to msg queue, now what?");

			    if (err) {		
				//debugout("??????????????? we have error 2: "+err);
				debugout(that.user, err.stack);
			    } else {
				if (i+this_packet_size < data.length)
				{
				    i+=that.recog_conf.packet_size;
				    //debugout("??????????????? calling myself at "+i);
				    setTimeout (function() {
					that.send_audio_packets(data,i, queue_index);
				    }, that.recog_conf.pause_between_packets);
				}
				else {
				    //debugout("??????????????? !"+(i+this_packet_size)+" < "+data.length);
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




    recogniser_client.prototype.reset_recogniser = function() {
	this.state = 'start_recog';
	this.start_recog();
	
    }

}

debugout = function(user, msg) {
    console.log("\x1b[31mrecogn %s\x1b[0m", logging.get_date_time().datetime + ' '+user + ': '+msg);
}


module.exports = recogniser_client;
