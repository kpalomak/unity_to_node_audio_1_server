

/* Module for calculating score for a pronunciation: */

var fur_hat_scorer(user, word, wordid, segmentation, likelihood) {


    /* When ready, return the score by emitting an event: */
       
    score =  Math.round(5.0*Math.random());




    score_event_object = { 'score' :  score }

    process.emit('user_event', user, wordid,'scoring_done', score_event_object };
   

}





module.exports = { fur_hat_scorer : fur_hat_scorer };
