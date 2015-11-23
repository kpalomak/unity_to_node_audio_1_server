using UnityEngine;
using System.Collections;
using System;
using System.IO;

//using AudioUploadForm;

public class test : MonoBehaviour {

    String playername = "Foo";

    String recUrl = "https://your-domain-here/siak-debug/asr";

    String micstring;
    bool micOn = false;
    AudioSource aud;

    int fs = 16000;
    int packetspersecond = 3;
    int maxAudioLen = 10;
    
    int audiobufflength;
    int realsamplingrate;
    int resamplingcoeff;

    int recstart;
    
    int sentpacketnr = 0;
    int sentbuffernr;
    int samplessent;
    bool finalpacket;
    int packetsize;

        //int buffsize = 0;
    int packetinterval;

    //    float[] audiodatabuffer = new float[ (fs*maxAudioLen) ];


    DateTime epochStart = new DateTime(1970, 1, 1, 8, 0, 0, DateTimeKind.Utc);

    // Use this for initialization
    void Start() {
        Debug.Log("Start recording: " + System.DateTime.Now);
        foreach (string device in Microphone.devices)
        {
            Debug.Log("Name: " + device);
        }

        AudioConfiguration currentconf = AudioSettings.GetConfiguration();

        realsamplingrate = currentconf.sampleRate;
      
        // A very crude way of doing resampling;
        // Let's add a low-pass filter and decimating downsampling when the time is near.

        resamplingcoeff = (int)Math.Floor((double)(realsamplingrate / fs));

        int channelcount = 2;

        audiobufflength = currentconf.dspBufferSize / resamplingcoeff / channelcount;

        packetinterval = fs / audiobufflength;

        packetsize = (int)Math.Floor((double)(fs / packetspersecond));

        recstart = Environment.TickCount;

        sentpacketnr = 0;
        finalpacket = false;

        micstring = Microphone.devices[0];

    }

    // Update is called once per frame
    void Update() {

  

        if (Input.GetKeyDown(KeyCode.Space))
        {
            GetComponent<Rigidbody>().velocity = Vector3.up * 5;
        }

        else if (Input.GetKeyDown(KeyCode.R) && micOn == false)
        {
            //GetComponent<Rigidbody>().velocity = Vector3.up * 5;
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
        Debug.Log("Setting packetnr = 0; finalpacket = false");
        sentpacketnr = 0;
        sentbuffernr = 0;
        //buffsize = 0;
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

        /*byte[] fyouall = new byte[audiodatabuffer.Length * 4];
        Buffer.BlockCopy(audiodatabuffer, 0, fyouall, 0, audiodatabuffer.Length);
        File.WriteAllBytes("/Users/Reima/temp/floaty",fyouall);*/
    }



    void sendAudioToRecogniser()
    {
        int dummy = 1;
        dummy++;
    }


    void checkStartUpload()
    {
        int writeHead = Microphone.GetPosition(micstring);

        if ( aud && ( ( micOn && writeHead > samplessent + packetsize )|| finalpacket))
        {
            Debug.Log("aud " + aud.ToString() + "&& (writeHead " + writeHead + " > samplessent "
                    + samplessent.ToString() + "+ packetsize " + packetsize.ToString() + "|| finalpacket " + finalpacket.ToString() + "))");

            int thispacketsize = packetsize;
            if (finalpacket)
            {
                thispacketsize = writeHead - samplessent;
            }
            float[] samples = new float[thispacketsize];
            aud.clip.GetData(samples, samplessent);

            startUpload(sentpacketnr++, finalpacket, samplessent, samples);
            sentbuffernr += packetinterval;

            samplessent += samples.Length;

            if (finalpacket)
            {
                finalpacket = false;
            }
        }


    }

    void startUpload(int thispacketnr, bool thisfinalpacket, int startsample,  float[] samples)
    {


        // from http://stackoverflow.com/questions/4635769/how-do-i-convert-an-array-of-floats-to-a-byte-and-back
        // This only copies the first item in the float array.
        // var byteArray = new byte[audiodata.Length * 4];
        // Buffer.BlockCopy(audiodata, 0, byteArray, 0, byteArray.Length);
        /*
        new ArraySegment<float>(audiodatabuffer, sentbuffernr, sentbuffernr + packetinterval);

        int floatstartpoint = (startpoint * audiobufflength );
        int floatendpoint = (endpoint * audiobufflength );

        Debug.Log("Copying " + floatstartpoint + "->" + floatendpoint + " from audiodatabuffer");
        */
        var bytesamples = new byte[(samples.Length*4)];
        Buffer.BlockCopy(samples, 0, bytesamples, 0, samples.Length*4);
        


        WWWForm audioForm = new WWWForm();

        var customheaders = audioForm.headers;

        customheaders["X-siak-user"] = playername;
        customheaders["X-siak-packetnr"] = thispacketnr.ToString();

        customheaders["X-siak-packet-arraystart"] = startsample.ToString();
        customheaders["X-siak-packet-arrayend"] = (startsample+samples.Length).ToString();
		customheaders["X-siak-packet-arraylength"] = (samples.Length).ToString();
        customheaders["X-siak-final-packet"] = finalpacket == true ? "true" : "false";

        String uploadfilename= "Gamedata-"+playername+ "_"+thispacketnr.ToString();

        //audioForm.AddBinaryData("X-siak-game-data", bytedatasegment, uploadfilename);
        audioForm.AddBinaryData("X-siak-game-data", bytesamples, uploadfilename);


        StartCoroutine(patientlyUpload(recUrl, audioForm.data, customheaders));

        

        //Debug.Log("This just in: "+wwwRec.text);

    }


    IEnumerator patientlyUpload(String targeturl, byte[] bytedata,  System.Collections.Generic.Dictionary<string,string> customheaders)
    {
        Debug.Log("Starting www thing:");
        WWW wwwRec = new WWW(targeturl, bytedata, customheaders);
        yield return wwwRec;
        Debug.Log(wwwRec.text);
    }

}
