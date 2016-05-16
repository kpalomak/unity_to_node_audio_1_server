

/* Module for calculating score for a pronunciation: */


/*

Input is like this:

user: foo
word: choose
wordid: 1
Segmentation:
0:
  0:
    state: 30
    start: 4
    end: 12
  1:
    state: 32
    start: 13
    end: 16
  2:
    state: 36
    start: 17
    end: 19
1:
  0:
    state: 1325
    start: 20
    end: 69
  1:
    state: 1334
    start: 70
    end: 72
  2:
    state: 1347
    start: 73
    end: 76
2:
  0:
    state: 1431
    start: 77
    end: 90
  1:
    state: 1448
    start: 91
    end: 96
  2:
    state: 1463
    start: 97
    end: 98
Likelihood: -2.429732261225581




Output should be a score between 1 and 5.


*/

var logging = require('../game_data_handling/logging.js');


var fur_hat_scorer = function(user, word, wordid, segmentation, likelihood) {

    debugout(user, "user: "+user);
    debugout(user, "word: "+word);
    debugout(user, "wordid: "+wordid);    
    debugout(user, "Segmentation:");
    Object.keys(segmentation).forEach(function(key) {
	if (typeof(segmentation[key]) === 'object') {
	    debugout(user, key+":");	    
	    Object.keys(segmentation[key]).forEach(function(key2) {
		if (typeof(segmentation[key][key2]) === 'object') {
		    debugout(user,"  " +key2+":");
		    Object.keys(segmentation[key][key2]).forEach(function(key3) {
			debugout(user,"    " +key3+": "+segmentation[key][key2][key3]);
		    });				
		}
		else { 
		    debugout(user,"  " +key2+": "+segmentation[key][key2]);
		}
	    });
	}
	else {
	    debugout(user,key+": "+segmentation[key]);
	}
    });
    debugout(user,"Likelihood: "+likelihood);


    // Here some processing could be made


    

    /* phoneme scoring results should be stored in an array that can
       be passed to a logging module. */

    phoneme_scores = [];       
    total_score =  Math.ceil(5.0*Math.random());

    /* When ready, return the score by emitting an event.
       The event call should include an object with score field
       and some classification info to be logged (ie. which phonemes 
       were good, which ones bad etc. */

    score_event_object = { 'total_score' :  total_score,
			   'phoneme_scores' : phoneme_scores }




    process.emit('user_event', user, wordid,'scoring_done', score_event_object );
   

}



/* Text output through this function will be green */
var debugout = function(user,msg) {
    console.log("\x1b[32m%s\x1b[0m", logging.get_date_time().datetime + ' '+user+': '+ msg);
}



module.exports = { fur_hat_scorer : fur_hat_scorer };
