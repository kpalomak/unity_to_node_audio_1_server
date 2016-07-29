

var aalto_to_classes= { "A": 0,
           "C": 1,
           "D": 2,
           "E": 3,
           "H": 4,
           "I": 5,
           "J": 6,
           "N": 7,
           "O": 8,
           "P": 9,
           "Q": 10,
           "R": 11,
           "S": 12,
           "T": 13,
           "U": 14,
           "W": 15,
           "Y": 16,
           "Z": 17,
           "a": 18,
           "b": 19,
           "d": 20,
           "e": 21,
           "f": 22,
           "g": 23,
           "i": 24,
           "j": 25,
           "k": 26,
           "l": 27,
           "m": 28,
           "n": 29,
           "o": 30,
           "p": 31,
           "r": 32,
           "s": 33,
           "t": 34,
           "u": 35,
           "v": 36,
           "w": 37,
           "z": 38,
           "Ä": 39,
           "Å": 40,
           "ä": 41,
           "å": 42,
           "ö": 43 };


var classes_to_aalto = {"0": "A",
			"1": "C",
			"2": "D",
           "3": "E",
           "4": "H",
           "5": "I",
           "6": "J",
           "7": "N",
           "8": "O",
           "9": "P",
           "10": "Q",
           "11": "R",
           "12": "S",
           "13": "T",
           "14": "U",
           "15": "W",
           "16": "Y",
           "17": "Z",
           "18": "a",
           "19": "b",
           "20": "d",
           "21": "e",
           "22": "f",
           "23": "g",
           "24": "i",
           "25": "j",
           "26": "k",
           "27": "l",
           "28": "m",
           "29": "n",
           "30": "o",
           "31": "p",
           "32": "r",
           "33": "s",
           "34": "t",
           "35": "u",
           "36": "v",
           "37": "w",
           "38": "z",
           "39": "Ä",
           "40": "Å",
           "41": "ä",
           "42": "å",
           "43": "ö"
};

var aalto_to_arpa = {
    "A": "aa",
    "ä": "ae",
    "a": "ah",
    "å": "aw",
    "Ä": "ay",
    "Å": "oy",
    "b": "b",
    "C": "ch",
    "d": "d",
    "D": "dh",
    "e": "eh",
    "E": "ey",
    "f": "f",
    "g": "g",
    "H": "hh",
    "i": "ih",
    "I": "iy",
    "J": "jh",
    "j": "y",
    "k": "k",
    "l": "l",
    "m": "m",
    "n": "n",
    "N": "ng",
    "O": "ao",
    "ö": "er",
    "o": "ow",
    "p": "p",
    "P": "ua",
    "Q": "ax",
    "R": "ia",
    "r": "r",
    "s": "s",
    "S": "sh",
    "t": "t",
    "T": "th",
    "U": "uh",
    "u": "uw",
    "v": "v",
    "W": "ea",
    "w": "w",
    "Y": "oh",
    "z": "z"
};

var arpa_to_festival_unilex = {
"aa": "aa",
"ae": "a",
"ah": "uh",
"ao": "oo",
"aw": "ow",
"ax": "@",
"ay": "ai",
"b": "b",
"ch": "ch",
"d": "d",
"dh": "dh",
"ea": "eir",
"eh": "e",
"er": "@@r",
"ey": "ei",
"f": "f",
"g": "g",
"hh": "h",
"ia": "i@", // WHAT? 
"ih": "i",
"iy": "ii",
"jh": "jh",
"k": "k",
"l": "lw",
"m": "m",
"n": "n",
"ng": "ng",
"oh": "o",
"ow": "ou",
"oy": "oi", // WHAT???
"p": "p",
"r": "r",
"s": "s",
"sh": "sh",
"t": "t",
"th": "th",
"ua": "oor",
"uh": "u",
"uw": "uu",
"v": "v",
"w": "w",
"y": "y",
"z": "z"
};

var festival_unilex_to_ipa= {
    "@" : "ə",
    "a" : "æ",
    "aa" : "ɑː",
    "aa" : "ɑr",
    "ai" : "aɪ",
    "b" : "b",
    "ch" : "tʃ",
    "d" : "d",
    "dh" : "ð",
    "e" : "ɛ",
    "ei" : "eɪ",
    "eir" : "ɛər",
    "f" : "f",
    "g" : "ɡ",
    "h" : "h",
    "i" : "ɪ",
    "i@" : "ɪər",
    "ii" : "iː",
    "jh" : "dʒ",
    "k" : "k",
    "l" : "l",
    "lw" : "l",
    "m" : "m",
    "n" : "n",
    "ng" : "ŋ",
    "o" : "ɒ",
    "oo" : "ɔː",
    "oi" : "oɪ", // Guessed by Reima
    "ou" : "oʊ",
    "ow" : "aʊ",
    "oor" : "ɔːr",
    "p" : "p",
    "r" : "r",
    "@@r" : "ɜː", 
    "s" : "s",
    "sh" : "ʃ",
    "t" : "t",
    "th" : "θ",
    "u" : "ʊ",
    "uh" : "ʌ",
    "uu" : "uː",
    "v" : "v",
    "w" : "w",
    "y" : "j",
    "z" : "z",
    "zh" : "ʒ",
    "l!" : "əl"
};

var phone_properties = {
    "aʊ":	{
	"vowel_length": {"value": 3, "name": "diphtong"},
	"frontness": {"value": 5, "name": "back"},
	"openness": {"value": 1, "name": "close"},
	"diphtong_frontness": {"value": 2, "name": "Near_front"},
	"diphtong_openness": {"value": 6, "name": "Near_open"},
	"roundness": {"value": 0, "name": "unrounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "oʊ":	{
	"vowel_length": {"value": 3, "name": "diphtong"},
	"frontness": {"value": 1, "name": "front"},
	"openness": {"value": 5, "name": "Open_mid"},
	"diphtong_frontness": {"value": 2, "name": "Near_front"},
	"diphtong_openness": {"value": 6, "name": "Near_open"},
	"roundness": {"value": 1, "name": "rounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ʊ":	{
	"vowel_length": {"value": 1, "name": "short"},
	"frontness": {"value": 2, "name": "Near_front"},
	"openness": {"value": 6, "name": "Near_open"},
	"diphtong_frontness": {"value": 2, "name": "Near_front"},
	"diphtong_openness": {"value": 6, "name": "Near_open"},
	"roundness": {"value": 0, "name": "unrounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "æ":	{
	"vowel_length": {"value": 1, "name": "short"},
	"frontness": {"value": 4, "name": "Near_back"},
	"openness": {"value": 3, "name": "Close_mid"},
	"diphtong_frontness": {"value": 4, "name": "Near_back"},
	"diphtong_openness": {"value": 3, "name": "Close_mid"},
	"roundness": {"value": 1, "name": "rounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ɪ":	{
	"vowel_length": {"value": 1, "name": "short"},
	"frontness": {"value": 4, "name": "Near_back"},
	"openness": {"value": 6, "name": "Near_open"},
	"diphtong_frontness": {"value": 4, "name": "Near_back"},
	"diphtong_openness": {"value": 6, "name": "Near_open"},
	"roundness": {"value": 0, "name": "unrounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ɪər":	{
	"vowel_length": {"value": 1, "name": "short"},
	"frontness": {"value": 4, "name": "Near_back"},
	"openness": {"value": 6, "name": "Near_open"},
	"diphtong_frontness": {"value": 3, "name": "central"},
	"diphtong_openness": {"value": 5, "name": "Open_mid"},
	"roundness": {"value": 0, "name": "unrounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "oɪ":	{
	"vowel_length": {"value": 3, "name": "diphtong"},
	"frontness": {"value": 1, "name": "front"},
	"openness": {"value": 5, "name": "Open_mid"},
	"diphtong_frontness": {"value": 4, "name": "Near_back"},
	"diphtong_openness": {"value": 6, "name": "Near_open"},
	"roundness": {"value": 1, "name": "rounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "aɪ":	{
	"vowel_length": {"value": 3, "name": "diphtong"},
	"frontness": {"value": 5, "name": "back"},
	"openness": {"value": 1, "name": "close"},
	"diphtong_frontness": {"value": 4, "name": "Near_back"},
	"diphtong_openness": {"value": 6, "name": "Near_open"},
	"roundness": {"value": 0, "name": "unrounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ɛ":	{
	"vowel_length": {"value": 1, "name": "short"},
	"frontness": {"value": 5, "name": "back"},
	"openness": {"value": 3, "name": "Close_mid"},
	"diphtong_frontness": {"value": 5, "name": "back"},
	"diphtong_openness": {"value": 3, "name": "Close_mid"},
	"roundness": {"value": 0, "name": "unrounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ɛər":	{
	"vowel_length": {"value": 3, "name": "diphtong"},
	"frontness": {"value": 5, "name": "back"},
	"openness": {"value": 3, "name": "Close_mid"},
	"diphtong_frontness": {"value": 3, "name": "central"},
	"diphtong_openness": {"value": 4, "name": "mid"},
	"roundness": {"value": 0, "name": "unrounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "iː":	{
	"vowel_length": {"value": 2, "name": "long"},
	"frontness": {"value": 5, "name": "back"},
	"openness": {"value": 7, "name": "open"},
	"diphtong_frontness": {"value": 5, "name": "back"},
	"diphtong_openness": {"value": 7, "name": "open"},
	"roundness": {"value": 0, "name": "unrounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ɑː":	{
	"vowel_length": {"value": 2, "name": "long"},
	"frontness": {"value": 1, "name": "front"},
	"openness": {"value": 1, "name": "close"},
	"diphtong_frontness": {"value": 1, "name": "front"},
	"diphtong_openness": {"value": 1, "name": "close"},
	"roundness": {"value": 1, "name": "rounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ɑr":	{
	"vowel_length": {"value": 3, "name": "diphtong"},
	"frontness": {"value": 1, "name": "front"},
	"openness": {"value": 1, "name": "close"},
	"diphtong_frontness": {"value": 1, "name": "front"},
	"diphtong_openness": {"value": 1, "name": "close"},
	"roundness": {"value": 1, "name": "rounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ɒ":	{
	"vowel_length": {"value": 1, "name": "short"},
	"frontness": {"value": 1, "name": "front"},
	"openness": {"value": 1, "name": "close"},
	"diphtong_frontness": {"value": 1, "name": "front"},
	"diphtong_openness": {"value": 1, "name": "close"},
	"roundness": {"value": 0, "name": "unrounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "eɪ":	{
	"vowel_length": {"value": 3, "name": "diphtong"},
	"frontness": {"value": 5, "name": "back"},
	"openness": {"value": 5, "name": "Open_mid"},
	"diphtong_frontness": {"value": 4, "name": "Near_back"},
	"diphtong_openness": {"value": 6, "name": "Near_open"},
	"roundness": {"value": 1, "name": "rounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ə":	{
	"vowel_length": {"value": 1, "name": "short"},
	"frontness": {"value": 3, "name": "central"},
	"openness": {"value": 4, "name": "mid"},
	"diphtong_frontness": {"value": 3, "name": "central"},
	"diphtong_openness": {"value": 4, "name": "mid"},
	"roundness": {"value": 0, "name": "unrounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ɜː":	{
	"vowel_length": {"value": 2, "name": "diphtong"},
	"frontness": {"value": 3, "name": "central"},
	"openness": {"value": 3, "name": "Close_mid"},
	"diphtong_frontness": {"value": 3, "name": "central"},
	"diphtong_openness": {"value": 3, "name": "Close_mid"},
	"roundness": {"value": 0, "name": "unrounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ɔː":	{
	"vowel_length": {"value": 2, "name": "long"},
	"frontness": {"value": 1, "name": "front"},
	"openness": {"value": 3, "name": "Close_mid"},
	"diphtong_frontness": {"value": 1, "name": "front"},
	"diphtong_openness": {"value": 3, "name": "Close_mid"},
	"roundness": {"value": 1, "name": "rounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ɔːr":	{
	"vowel_length": {"value": 3, "name": "long"},
	"frontness": {"value": 1, "name": "front"},
	"openness": {"value": 3, "name": "Close_mid"},
	"diphtong_frontness": {"value": 1, "name": "front"},
	"diphtong_openness": {"value": 3, "name": "Close_mid"},
	"roundness": {"value": 1, "name": "rounded"},
	"type": {"value": 1, "name": "vowel"}
    },    "uː":	{
	"vowel_length": {"value": 2, "name": "long"},
	"frontness": {"value": 1, "name": "front"},
	"openness": {"value": 7, "name": "open"},
	"diphtong_frontness": {"value": 1, "name": "front"},
	"diphtong_openness": {"value": 7, "name": "open"},
	"roundness": {"value": 1, "name": "rounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "ʌ":	{
	"vowel_length": {"value": 1, "name": "short"},
	"frontness": {"value": 1, "name": "front"},
	"openness": {"value": 3, "name": "Close_mid"},
	"diphtong_frontness": {"value": 1, "name": "front"},
	"diphtong_openness": {"value": 3, "name": "Close_mid"},
	"roundness": {"value": 0, "name": "unrounded"},
	"type": {"value": 1, "name": "vowel"}
    },
    "b":	{
	"voiced": {"value": 1, "name": "voiced"},
	"place": {"value": 12, "name": "Labio_velar"},
	"manner": {"value": 8, "name": "Trill"},
	"type": {"value": 0, "name": "consonant"}
    },
    "d":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 10, "name": "dorsal"},
	"manner": {"value": 8, "name": "Trill"},
	"type": {"value": 0, "name": "consonant"}
    },
    "ð":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 10, "name": "dorsal"},
	"manner": {"value": 4, "name": "Non_sib_affric"},
	"type": {"value": 0, "name": "consonant"}
    },
    "dʒ":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 7, "name": "Coronal"},
	"manner": {"value": 7, "name": "Approximant"},
	"type": {"value": 0, "name": "consonant"}
    },
    "f":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 11, "name": "glottal"},
	"manner": {"value": 4, "name": "Non_sib_affric"},
	"type": {"value": 0, "name": "consonant"}
    },
    "ɡ":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 4, "name": "labial"},
	"manner": {"value": 8, "name": "Trill"},
	"type": {"value": 0, "name": "consonant"}
    },
    "h":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 2, "name": "Labio_dental"},
	"manner": {"value": 4, "name": "Non_sib_affric"},
	"type": {"value": 0, "name": "consonant"}
    },
    "j":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 5, "name": "alveolar"},
	"manner": {"value": 3, "name": "sibilant_affric"},
	"type": {"value": 0, "name": "consonant"}
    },
    "k":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 4, "name": "labial"},
	"manner": {"value": 8, "name": "Trill"},
	"type": {"value": 0, "name": "consonant"}
    },
    "l":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 10, "name": "dorsal"},
	"manner": {"value": 1, "name": "nasal"},
	"type": {"value": 0, "name": "consonant"}
    },
    "m":	{
	"voiced": {"value": 1, "name": "voiced"},
	"place": {"value": 12, "name": "Labio_velar"},
	"manner": {"value": 9, "name": "Lateral_Approx"},
	"type": {"value": 0, "name": "consonant"}
    },
    "n":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 10, "name": "dorsal"},
	"manner": {"value": 9, "name": "Lateral_Approx"},
	"type": {"value": 0, "name": "consonant"}
    },
    "ŋ":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 4, "name": "labial"},
	"manner": {"value": 9, "name": "Lateral_Approx"},
	"type": {"value": 0, "name": "consonant"}
    },
    "p":	{
	"voiced": {"value": 1, "name": "voiced"},
	"place": {"value": 12, "name": "Labio_velar"},
	"manner": {"value": 9, "name": "Lateral_Approx"},
	"type": {"value": 0, "name": "consonant"}
    },
    "r":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 8, "name": "Palatal"},
	"manner": {"value": 2, "name": "stop"},
	"type": {"value": 0, "name": "consonant"}
    },
    "s":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 10, "name": "dorsal"},
	"manner": {"value": 4, "name": "Non_sib_affric"},
	"type": {"value": 0, "name": "consonant"}
    },
    "ʃ":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 7, "name": "Coronal"},
	"manner": {"value": 5, "name": "Sibilant_fric"},
	"type": {"value": 0, "name": "consonant"}
    },
    "t":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 10, "name": "dorsal"},
	"manner": {"value": 8, "name": "Trill"},
	"type": {"value": 0, "name": "consonant"}
    },
    "tʃ":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 7, "name": "Coronal"},
	"manner": {"value": 7, "name": "Approximant"},
	"type": {"value": 0, "name": "consonant"}
    },
    "v":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 11, "name": "glottal"},
	"manner": {"value": 6, "name": "Non_sib fric"},
	"type": {"value": 0, "name": "consonant"}
    },
    "w":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 1, "name": "bilabial"},
	"manner": {"value": 3, "name": "sibilant_affric"},
	"type": {"value": 0, "name": "consonant"}
    },
    "z":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 10, "name": "dorsal"},
	"manner": {"value": 5, "name": "Sibilant_fric"},
	"type": {"value": 0, "name": "consonant"}
    },
    "ʒ":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 7, "name": "Coronal"},
	"manner": {"value": 5, "name": "Sibilant_fric"},
	"type": {"value": 0, "name": "consonant"}
    },
    "θ":	{
	"voiced": {"value": 0, "name": "unvoiced"},
	"place": {"value": 10, "name": "dorsal"},
	"manner": {"value": 4, "name": "Non_sib_affric"},
	"type": {"value": 0, "name": "consonant"}
    }
};


module.exports = {
    "aalto_to_classes" :  aalto_to_classes,
    "classes_to_aalto" : classes_to_aalto,
    "aalto_to_arpa" :  aalto_to_arpa,
    "arpa_to_festival_unilex" : arpa_to_festival_unilex,
    "festival_unilex_to_ipa" : festival_unilex_to_ipa,
    "phone_properties" : phone_properties 
};

