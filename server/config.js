

module.exports = {
    database : {
	address : 'localhost:27017/siak_proto'
    },
    gamedatadir : './game_data/',
    audioconf : {
	'fs'                     : 16000,
	'max_utterance_length_s' : 10,
	'max_packet_length_s'    : 1,
	'packets_per_second'     : 3,
	'datatype_length'        : 4,
	'frame_step_samples'     : 128,
	'frame_length_samples'   : 400,
	'frame_step_bits'        : 512,
	'frame_length_bits'      : 16000,
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
    },
    recogconf : {
	'grammar' : 'words.conf',
	'packet_size' : 2048,
	'pause_between_packets' : 20,
	'lexicon' : '/home/siak/models/clean-am/words.lex',
	'model' : '/home/siak/models/clean-am/siak_clean_b',
	'flag_use_adaptation': 1
	//'model' : '/home/backend/models/mc-am_2016-06-11/siak_mc_a'
    },
    dnnconf : {
	'port' : 16054,
	'datadim' : 30,
	'timesteps' : 63,
	'datasize' : 4,
	'port_number_file' : '/home/backend/siak-server/keras_server/ports/portnr'
	//'model_arch_file':  '/l/data/siak-server-devel/server/dnn_models/l1000_d0.6-2016-07-12-architecture.json',
	//'model_weight_file' : '/l/data/siak-server-devel/server/dnn_models/l1000_d0.6-2016-07-12-weights.26-1.54.hdf5',
	//'model_norm_file' : '/l/data/siak-server-devel/server/dnn_models/clean.mean_and_std.pkl'

    },
    temp_devel_stuff : {
	'good_utterance_length_s' : 3
    },
    vad : {
	'window' : 160*4, // VAD window size (10ms of 16kHz 4bit float data)
	'speech_frame_thr' : 5, // How many consecutive speech frames are needed for a speech segment decision
	'sil_frame_thr' : 10 // How many consecutive silence frames are needed for a silence segment decision
    }
}
