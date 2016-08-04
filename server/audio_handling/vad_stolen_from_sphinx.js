
/**
 * Implements a level tracking endpointer invented by Bent Schmidt Nielsen.
 * <p>This endpointer is composed of two main steps. 
 * <ol> 
 * <li>classification of audio into speech and non-speech
 * <li>inserting SPEECH_START and SPEECH_END signals around speech and removing non-speech regions 
 * </ol>
 * <p>
 * The first step, classification of audio into speech and non-speech, uses Bent Schmidt Nielsen's algorithm. Each
 * time audio comes in, the average signal level and the background noise level are updated, using the signal level of
 * the current audio. If the average signal level is greater than the background noise level by a certain threshold
 * value (configurable), then the current audio is marked as speech. Otherwise, it is marked as non-speech.
 * <p>
 * The second step of this endpointer is documented in the class {@link SpeechMarker SpeechMarker}
 *
 * @see SpeechMarker
 */



// Original code by CMU: 

/*
 * Copyright 1999-2002 Carnegie Mellon University.  
 * Portions Copyright 2002 Sun Microsystems, Inc.  
 * Portions Copyright 2002 Mitsubishi Electric Research Laboratories.
 * All Rights Reserved.  Use is subject to license terms.
 * 
 * See the file "license.terms" for information on usage and
 * redistribution of this file, and for a DISCLAIMER OF ALL 
 * WARRANTIES.
 *
 */


// sphinx4/license.terms:
/*

Copyright 1999-2015 Carnegie Mellon University.  
Portions Copyright 2002-2008 Sun Microsystems, Inc.  
Portions Copyright 2002-2008 Mitsubishi Electric Research Laboratories.
Portions Copyright 2013-2015 Alpha Cephei, Inc.

All Rights Reserved.  Use is subject to license terms.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer. 

2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in
   the documentation and/or other materials provided with the
   distribution.

3. Original authors' names are not deleted.

4. The authors' names are not used to endorse or promote products
   derived from this software without specific prior written
   permission.

This work was supported in part by funding from the Defense Advanced 
Research Projects Agency and the National Science Foundation of the 
United States of America, the CMU Sphinx Speech Consortium, and
Sun Microsystems, Inc.

CARNEGIE MELLON UNIVERSITY, SUN MICROSYSTEMS, INC., MITSUBISHI
ELECTRONIC RESEARCH LABORATORIES AND THE CONTRIBUTORS TO THIS WORK
DISCLAIM ALL WARRANTIES WITH REGARD TO THIS SOFTWARE, INCLUDING ALL
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL
CARNEGIE MELLON UNIVERSITY, SUN MICROSYSTEMS, INC., MITSUBISHI
ELECTRONIC RESEARCH LABORATORIES NOR THE CONTRIBUTORS BE LIABLE FOR
ANY SPECIAL, INDIRECT OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT
OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/


/*
 * Crudely forced to js for the SIAK project by Aalto University 2016.
 * So... I rewrote the code almost completely, but I thin we owe
 * Bent Schmidt Nielsen some credit if this thing works.
 *
 * Cheers, Reima Karhila 2016
 */

var config = require('../config.js');

var float_coeff = 256 ;//= 32000;

var classify_frame = function(audiobuffer, parameters) {

    var minSignal = (config.vad.min_signal | 0);    
    var threshold = (config.vad.threshold | 10);

    var average_number = (config.vad.average_number | 1.0);
    var adjustment = (config.vad.adjustment | 0.003);    

    var level = (parameters.level);
    var background = (parameters.background );

    var current = log_root_mean_square(audiobuffer);
      
    var is_speech = false;

    if (current >= minSignal) {
        level = ((level * average_number) + current) / (average_number + 1);
        if (current < background) {
            background = current;
        } else {
            background += (current - background) * adjustment;
        }
        if (level < background) {
            level = background;
        }
        is_speech = (level - background > threshold);
    }    

    //var std=frame_hamming_var(audiobuffer);

    //console.log(current+ "\t"+is_speech);

    /*console.log ( { speech: is_speech,
	     level: level,
	     background: background
	   });*/

    return { speech: is_speech,
	     is_speech: is_speech,
	     level: level,
	     background: background,
	     current : current,
	     leveldiff : (level - background),
	     // std: std
	   }
}


var log_root_mean_square = function (audiobuffer)  {

    var sumOfSquares = 0.0;
    
    // 4-bit floats:
    var samplecount = audiobuffer.length/4;
    var sample = 0;

    for (var floatindex = 0; floatindex <  audiobuffer.length; floatindex +=4) {
	//console.log(audiobuffer.readFloatLE(floatindex));
	sample = audiobuffer.readFloatLE(floatindex) * float_coeff ;
        sumOfSquares += sample * sample;
    }
    var rootMeanSquare = Math.sqrt(sumOfSquares / samplecount);


    //rootMeanSquare = Math.max(rootMeanSquare, 1.0);

    return Math.log(rootMeanSquare)/Math.log(10) * 20;
    
}

/*

var hamming = [0.0800, 0.0804, 0.0814, 0.0832, 0.0857, 0.0889, 0.0929, 0.0975, 0.1028, 0.1088, 0.1155, 0.1228, 0.1308, 0.1394, 0.1486, 0.1585, 0.1689, 0.1800, 0.1915, 0.2037, 0.2163, 0.2295, 0.2432, 0.2573, 0.2718, 0.2868, 0.3022, 0.3179, 0.3340, 0.3504, 0.3671, 0.3841, 0.4013, 0.4187, 0.4364, 0.4542, 0.4721, 0.4901, 0.5082, 0.5264, 0.5445, 0.5627, 0.5808, 0.5989, 0.6169, 0.6348, 0.6525, 0.6700, 0.6873, 0.7044, 0.7213, 0.7378, 0.7541, 0.7700, 0.7856, 0.8007, 0.8155, 0.8298, 0.8437, 0.8571, 0.8701, 0.8825, 0.8943, 0.9056, 0.9164, 0.9265, 0.9361, 0.9450, 0.9533, 0.9610, 0.9680, 0.9743, 0.9799, 0.9849, 0.9892, 0.9927, 0.9956, 0.9978, 0.9992, 0.9999, 0.9999, 0.9992, 0.9978, 0.9956, 0.9927, 0.9892, 0.9849, 0.9799, 0.9743, 0.9680, 0.9610, 0.9533, 0.9450, 0.9361, 0.9265, 0.9164, 0.9056, 0.8943, 0.8825, 0.8701, 0.8571, 0.8437, 0.8298, 0.8155, 0.8007, 0.7856, 0.7700, 0.7541, 0.7378, 0.7213, 0.7044, 0.6873, 0.6700, 0.6525, 0.6348, 0.6169, 0.5989, 0.5808, 0.5627, 0.5445, 0.5264, 0.5082, 0.4901, 0.4721, 0.4542, 0.4364, 0.4187, 0.4013, 0.3841, 0.3671, 0.3504, 0.3340, 0.3179, 0.3022, 0.2868, 0.2718, 0.2573, 0.2432, 0.2295, 0.2163, 0.2037, 0.1915, 0.1800, 0.1689, 0.1585, 0.1486, 0.1394, 0.1308, 0.1228, 0.1155, 0.1088, 0.1028, 0.0975, 0.0929, 0.0889, 0.0857, 0.0832, 0.0814, 0.0804, 0.0800 ];

var math = require('mathjs');

var frame_hamming_var = function(audiobuffer) {

    windowed = [];

    for (var i = 0; i <  audiobuffer.length/4; i++) {
	windowed.push(audiobuffer.readFloatLE(i*4) *  hamming[i] * float_coeff);
    }
    
    return math.std(math.matrix(windowed));
}
*/

module.exports = { classify_frame : classify_frame }
