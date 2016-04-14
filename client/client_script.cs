using UnityEngine;
using System.Collections;
using System;
using System.IO;
using System.Text;

using SimpleJSON;

public class client_script : MonoBehaviour {

    // Variables for the game project:
    String recUrl = "http://asr.aalto.fi/siak-debug/asr";
    String logUrl = "http://asr.aalto.fi/siak-debug/log-action";
    String loginUrl = "http://asr.aalto.fi/siak-debug/login";
    String logoutUrl = "http://asr.aalto.fi/siak-debug/logout";

    String playername = "foo";
    String playerpassword = "bar";

    
    // if or when the server crashes during the game session, the password will
    // be useful to avoid logging in again. Should be strongly encrypted in https anyway!

    // Variables for defining audio:
    int fs = 16000;
    int packetspersecond = 3;
    int maxAudioLen = 10; 

    string currentword = "choose";

    // Variables for recording:
    String micstring;
    AudioSource aud;    
    bool micOn = false;
    int recstart;
    
    // Variables for controlling packet sending:
    int sentpacketnr = 0;
    int samplessent = 0;
    bool finalpacket = false;
    int packetsize;



    // Use this for initialization
    void Start() {

    	// Calculate some essential values:
        packetsize = (int)Math.Floor((double)(fs / packetspersecond));


        foreach (string device in Microphone.devices)
        {
            Debug.Log("Name: " + device);
        }

	// Hard-coded to use mic number 0; Bad Idea but where to choose these?
        micstring = Microphone.devices[0];


        recstart = Environment.TickCount;

        sentpacketnr = 0;
        finalpacket = false;


    }


    //
    //
    //  This bit should be replaced by commands coming from 
    //  the game engine. Now how would we do that?
    //
    // 
    // Update is called once per frame
    void Update() {

        if (Input.GetKeyUp(KeyCode.S)) {
            startSession();
        }

        if (Input.GetKeyUp(KeyCode.D))
        {
            defineWord();
        }

        // Simple controls for recording with key "r" pressed down:   
        else if (Input.GetKeyDown(KeyCode.R) && micOn == false)
        {
            recstart = Environment.TickCount;
            Debug.Log("Starting second: " + recstart.ToString());
            startRec();            
        }
        else if (micOn == true && ( Input.GetKeyUp(KeyCode.R)  || recstart + 1000*maxAudioLen < Environment.TickCount ) )
        {
            Debug.Log("Stop recording: " + System.DateTime.Now);
            // Stop recording!
            stopRec();
        }

        checkStartUpload();

    }

    void startRec()
    {
        //Start recording:
        aud = GetComponent<AudioSource>();

        // Device 0, no looping, 10 s record at 16 kHz:
        aud.clip = Microphone.Start(micstring, false, maxAudioLen, fs);
        micOn = true;

        sentpacketnr = 0;
        samplessent = 0;
        finalpacket = false;

        aud.Play();
    }

    void stopRec()
    {
        Debug.Log("Setting finalpacket = true");    
        finalpacket = true;
        micOn = false;
        aud.Stop();
    }

    void checkStartUpload()
    {
        int writeHead = Microphone.GetPosition(micstring);
        //Debug.Log("writeHead: "+writeHead.ToString());    

        if ( aud && ( ( micOn && writeHead > samplessent + packetsize )|| finalpacket))
        {
            int thispacketsize = packetsize;

	    // The last packet might be smaller than the standard packet size:
            if (finalpacket)
            {
                thispacketsize = writeHead - samplessent;
            }

	    // Copy the relevant audio data to a float array at the samplessent point:
            float[] samples = new float[thispacketsize];
            aud.clip.GetData(samples, samplessent);

            startUpload(sentpacketnr++, finalpacket, samplessent, samples);


	    // Book-keeping for packets:
            samplessent += samples.Length;

            if (finalpacket)
            {
                finalpacket = false;
            }
        }


    }

    void startSession()
    {

        WWWForm sessionStartForm = new WWWForm();

        var customheaders = sessionStartForm.headers;
        customheaders = addCustomHeaders(customheaders, "-2", null);

      	// Start the upload in a new thread:
        StartCoroutine(patientlyStartSession(recUrl, customheaders));

        return ;
    }


    void defineWord()
    {
        WWWForm sessionStartForm = new WWWForm();

        var customheaders = addCustomHeaders(sessionStartForm.headers, "-1", currentword);

        // Start the upload in a new thread:
        StartCoroutine(patientlyStartSession(recUrl, customheaders));
    }




    IEnumerator patientlyStartSession(String targetUrl, System.Collections.Generic.Dictionary<string,string> customheaders)
    {
        WWW wwwResponse = new WWW(targetUrl, null, customheaders);

        yield return wwwResponse;

        var audioconf = JSON.Parse(wwwResponse.text);
        fs = Convert.ToInt32(audioconf["fs"]);
        packetspersecond = Convert.ToInt32(audioconf["packets_per_second"]);
        maxAudioLen = Convert.ToInt32(audioconf["max_utterance_length_s"]); 

        // Our answer from the server:
        //Debug.Log(wwwResponse.text);
    }


    void startUpload(int thispacketnr, bool thisfinalpacket, int startsample,  float[] samples)
    {
	// Make a byte array of the float array:

        // from http://stackoverflow.com/questions/4635769/how-do-i-convert-an-array-of-floats-to-a-byte-and-back
        // This only copies the first item in the float array.
        // var byteArray = new byte[audiodata.Length * 4];
        // Buffer.BlockCopy(audiodata, 0, byteArray, 0, byteArray.Length);

        var bytesamples = new byte[(samples.Length*4)];
        Buffer.BlockCopy(samples, 0, bytesamples, 0, samples.Length*4);
      
        WWWForm audioForm = new WWWForm();

        var customheaders = audioForm.headers;
        addCustomHeaders(customheaders, thispacketnr.ToString(), currentword);

        customheaders["X-siak-packet-arraystart"] = startsample.ToString();
 	    customheaders["X-siak-packet-arrayend"] = (startsample+samples.Length).ToString();
    	customheaders["X-siak-packet-arraylength"] = (samples.Length).ToString();
        customheaders["X-siak-final-packet"] = finalpacket == true ? "true" : "false";

    	// Start the upload in a new thread:
        StartCoroutine(patientlyUpload(recUrl, bytesamples, customheaders));
    }


    IEnumerator doSomeLogging(String actionName)
    {
        WWWForm loggingForm = new WWWForm();

        var customheaders = addCustomHeaders(loggingForm.headers, null, null);
        customheaders["X-siak-game-action"] = actionName;

        WWW wwwRec = new WWW(logUrl, null, customheaders);

        yield return wwwRec;
    }

    IEnumerator patientlyUpload(String targeturl, byte[] bytedata,  System.Collections.Generic.Dictionary<string,string> customheaders)
    {
	// Uploading:
        WWW wwwRec = new WWW(targeturl, Encoding.UTF8.GetBytes(Convert.ToBase64String(bytedata)), customheaders);

        yield return wwwRec;

	// Our answer from the server:
        Debug.Log(wwwRec.text);
    }

    System.Collections.Generic.Dictionary<string,string> addCustomHeaders(System.Collections.Generic.Dictionary<string,string>customheaders, String packetnr, String word) {

        customheaders["X-siak-user"] = playername;
        customheaders["X-siak-password"] = playerpassword;
        customheaders["X-siak-level"] = "1";
        customheaders["X-siak-region"] = "2";

        

        if (packetnr != null)
            customheaders["X-siak-packetnr"] = "-2";

        if (word != null)
            customheaders["X-siak-current-word"] = currentword;
        
        return customheaders;
    }
}
