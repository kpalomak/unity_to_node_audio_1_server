
if ( process.argv.length < 3) {
    console.log("Usage: node test_vad_with_wav.js wavfile (framelength)");
    console.log("Outputs frame start (s), VAD decision, smoothed VAD decisions");
    process.exit();
}


var framelength=160;

if ( process.argv.length > 3) {
    framelength=process.argv[4];
}


var vad = require('./vad_stolen_from_sphinx');

var fs = require('fs');


var consec_silence = 10;
var consec_speech = 5;

var samplerate = 16000; 
var datasize = 2 ; // 2 bytes / sample

var wav = require('wav');
var file = fs.createReadStream(process.argv[2]);
var reader = new wav.Reader();

//var audiostring = '';
var audio = new Buffer(0);


// the "format" event gets emitted at the end of the WAVE header
reader.on('format', function (format) {
    // do your calculation here, using format

    reader.on('data', function (data) {  
	//console.log("Got data: "+data.length);
	
	audio = Buffer.concat([audio,data]);
    });

    reader.on('end', function () {  
	//var audio = fs.readFileSync(process.argv[2]);

	//var audio = new Buffer(audiostring, "binary");

	p = {level: 0, background:20};

	var numsil = 0;
	var numsp = 0;

	var spnow = 0;

	var sp=[];

	var audioslice = new Buffer(framelength*4);

	for (i=0; i< audio.length-framelength*2; i+=framelength*2) {

	    /* Read 16-bit signed integers from data buffer and write floats
	       to buffer that is sent to VAD */
	    for (j=0; j<framelength*2; j+=2) {
		//console.log("Reading "+(audio.readInt16LE(i+j)) +" from "+(i+j)+" writing "+ (audio.readInt16LE(i+j)/32767.0) +"to "+j*2);
		audioslice.writeFloatLE(audio.readInt16LE(i+j)/32767.0, j*2);
	    }
	    
	    /* Run VAD on the frame, take the return parameters
	       and use them for the next round also: */
	    p = vad.classify_frame(audioslice, p);

	    sp.push(p.speech);

	    /*

	      // For debugging:
	      console.log(i/2/16000+'\t'+  // 1
			p.current + "\t" +  //4
			p.level  + "\t" +  //5
			p.background + '\t'+ //6
			p.leveldiff+  "\t"+  //7
			p.speech);*/
	}

	var spfinal = sp.slice();

	for (n=0; n<sp.length;n++) {
	    
	    if (sp[n]) {numsp++;numsil=0;} else {numsp=0;numsil++;}
	    
	    if (spnow && (numsil > consec_silence)) {
		spnow=0;
		for (i=n-consec_silence;i<=n;i++) {
		    //console.log("Got sil in frame "+n+" and so also changing value in "+i);
		    spfinal[i]=0;
		}
	    }
	    else if ((!spnow) && (numsp > consec_speech)) {
		spnow = 1;
		for (i=n-consec_speech;i<=n;i++) {
		    //console.log("Got speech in frame "+n+" and so also changing value in "+i);
		    spfinal[i]=1;
		}	
	    }
	    else spfinal[n]=spnow;
	}

	for  (n=0; n<sp.length;n++) {
	    console.log(n*framelength/samplerate + '\t' + 1*sp[n] + '\t' + spfinal[n]);
	}
    });
});

// pipe the WAVE file to the Reader instance
file.pipe(reader);

