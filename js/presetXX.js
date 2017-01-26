class Presets {
    constructor(){
        this.preset01 = presetXX();
    }
}

/* ========================================================================== */
/*
                        
                        JARZOMBEK SYNTH GEN 2K17 

                        1. Choose base synth
                        2. Choose effects 
                        3. Adjust effects at will

                        Tone Docs: https://tonejs.github.io/docs/

*/
/* ========================================================================== */
// Visualization stuff
function presetXX() {


    var fft = new Tone.Analyser("fft", 32);
    var waveform = new Tone.Analyser("waveform", 1024);




    /* ========================================================================== */
    /* ============================= BASE SYNTH ================================= */
    /* ========================================================================== */

    // Basic Synth =================================================================
    var synthBase = new Tone.Synth({
        volume: -5,
        oscillator : {
            type : "square"
        },
        envelope : {
            attack  : 0.1,
            decay   : 0.1,
            sustain : 0.7,
            release : 1,
        },
        filterEnvelope: {
            attack:0.1,
            decay:0,
            sustain:1,
            release:0.5,
        },
        portamento:0,
    });

    // Duo Synth ===================================================================
    var duoBase = new Tone.DuoSynth({
        vibratoAmount:0.5,
        vibratoRate:5,
        harmonicity:1.5,
        voice0: {
            volume:-5,
            portamento:0,
            oscillator:{
                type:"sine"
            },
            filterEnvelope: {
                attack:0.01,
                decay:0,
                sustain:1,
                release:0.5,
            },
            envelope: {
                attack:0.01,
                decay:0,
                sustain:1,
                release:0.5,
            },
        },
        voice1:{
            volume:-5,
            portamento:0,
            oscillator: {
                type:"sine"
            },
            filterEnvelope: {
                attack:0.01,
                decay:0,
                sustain:1,
                release:0.5,
            },
            envelope: {
                attack:0.01,
                decay:0,
                sustain:1,
                release:0.5,
            },
        }
    });

    // Membrane Synth ==============================================================
    var membraneBase = new Tone.MembraneSynth({
        pitchDecay:0.05,
        octaves:10,
        oscillator:{
            type:"sine"
        },
        envelope:{
            attack:0.001,
            decay:0.4,
            sustain:0.01,
            release:1.4,
            attackCurve:"exponential"
        }
    })

    // Bassy Synth =================================================================
    var bassyBase = new Tone.MonoSynth(
        {
            "portamento": 0.08,
            "oscillator": {
                "partials": [2, 1, 3, 2, 0.4]
            },
            "filter": {
                "Q": 4,
                "type": "lowpass",
                "rolloff": -48
            },
            "envelope": {
                "attack": 0.04,
                "decay": 0.06,
                "sustain": 0.4,
                "release": 1
            },
            "filterEnvelope": {
                "attack": 0.01,
                "decay": 0.1,
                "sustain": 0.6,
                "release": 1.5,
                "baseFrequency": 50,
                "octaves": 3.4
            }
        }
    );





    /* ========================================================================== */
    /* ============================= EFFECTS RACK =============================== */
    /* ========================================================================== */


    // Autofilter ==================================================================
    var autoFilter  = new Tone.AutoFilter({
        frequency : 1,   // speed
        type : "sine",   // wave type
        depth : 1,       
        baseFrequency : 200, // in Hz
        octaves : 2.6,
        filter : {
            type : "lowpass",
            rolloff : -12,
            Q : 1
        }
    }).toMaster().start();


    // AutoWah =====================================================================
    var autoWah = new Tone.AutoWah({
        baseFrequency : 100,    // Freq of low point 
        octaves : 6,            // how steep
        sensitivity : 0,    
        Q : 2,                  // quality
        gain : 2,
        follower : {
            attack : 0.3,
            release : 0.5,
        }
    }).toMaster();


    // Chebyshev waveshaper ========================================================
    var cheby = new Tone.Chebyshev({
        order : 50  // 1-50 - big difference between even/odd
    }).toMaster();


    // Chorus ======================================================================
    var chorus = new Tone.Chorus({
        frequency : 1.5,
        delayTime : 3.5,
        depth : 0.7,
        feedback : 0.1,
        type : "sine",
        spread : 180
    }).toMaster();


    // Distortion ==================================================================
    var distortion = new Tone.Distortion({
        distortion:0.4  ,   // 0 to 1
    }).toMaster();


    // Feedback Delay ==============================================================
    var feedbackDelay = new Tone.FeedbackDelay({
        delayTime : 0.25,
        feedback : .5,
    }).toMaster();


    // Freeverb ====================================================================
    var freeverb = new Tone.Freeverb({
        roomSize : 0.7,     // 0 to 1 **** WARNING DO NOT SET TO 1 ****
        dampening : 3000,   // Frequency - where to cut the highs
    }).toMaster();


    // Filter LP ===================================================================
    var filterLP = new Tone.Filter({
        frequency : 5000,
        type : "lowpass", // Types: "lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "notch", "allpass", or "peaking".
    }).toMaster();


    // Filter HP ===================================================================
    var filterHP = new Tone.Filter({
        type : "highpass",
        frequency : 1050
    }).toMaster();


    // JC Reverb - Schroeder Reverberator ==========================================
    var JCReverb = new Tone.JCReverb({
        roomSize : .1      // 0 to 1 (infinite)
    }).toMaster();


    // Ping Pong Delay =============================================================
    var pingPongDelay = new Tone.PingPongDelay({
        delayTime : 0.25,
        feedback : .3,
        wet : .5
    }).toMaster();


    // Phaser ======================================================================
    var phaser = new Tone.Phaser({
        "frequency" : 5, 
        "octaves" : 2, 
        "baseFrequency" : 100
    }).toMaster();


    // Tremolo =====================================================================
    var tremolo = new Tone.Tremolo({
        "frequency" : 10,
        "type" : "sine",
        "depth" : 0.8,
        "spread" : 180
    }).toMaster().start();


    // Vibrato =====================================================================
    var vibrato = new Tone.Vibrato({
        "maxDelay" : 0.05,
        "frequency" : 5,
        "depth" : 0.1,
        "type" : "sine"
    }).toMaster();

    var limiter = new Tone.Limiter(-6).toMaster();



    /* ========================================================================== */
    /* ========================================================================== */
    /* ==========  ASSIGN SYNTH  ================================================ */
    /* ========================================================================== */
    /* ========================================================================== */
     
    presetXX = synthBase;
    //presetXX = duoBase;
    //presetXX = membraneBase;
    //presetXX = bassyBase;



    /* ========================================================================== */
    /* ========================================================================== */
    /* =========  ASSIGN EFFECTS  =============================================== */
    /* ========================================================================== */
    /* ========================================================================== */
    /* 

        EFFECTS

        --------------------
        autoFilter
        autoWah
        cheby
        chorus
        distortion
        feedbackDelay
        filterLP
        filterHP
        freeverb
        JCReverb
        pingPongDelay
        phaser
        tremolo
        vibrato
        --------------------

      2. Assign effects 
        - in REVERSE order - example: synth.chain(autoWah, JCReverb, pingPongDelay)
        - keep the limiter

    ========================================================================== */

    //seems to be in reverse order
    presetXX.chain(filterLP, JCReverb, tremolo, limiter, Tone.Master).fan(fft, waveform);



    return presetXX;
}


/* ========================================================================== */
/* ========================================================================== */
/* ========================================================================== */
/* ========================================================================== */
/* ========================================================================== */
/* ========================================================================== */
/* ========================================================================== */



/* ========================================================================== */
/* =============================== KEYBOARD ================================= */
/* ========================================================================== */
/*
var keyboard = new QwertyHancock({
    id: 'keyboard',
    width: 500,
    height: 150,
    startNote: 'A2',
    whiteNotesColour: '#fff',
    blackNotesColour: '#000',
    borderColour: '#AAA',
    activeColour: '#AAA',
    octaves: 2
});

keyboard.keyDown = function (note, frequency) {
    presetXX.triggerAttack(note);
};

keyboard.keyUp = function (note, frequency) {
    presetXX.triggerRelease();
};

// ========================================================================== 


$(document).ready(function() {
    makeWaveVis();
});

function makeWaveVis() {
    //drawing the FFT
    var fftContext = $("<canvas>",{
        "id" : "fft"
    }).appendTo("#Content").get(0).getContext("2d");

    function drawFFT(values){
        fftContext.clearRect(0, 0, canvasWidth, canvasHeight);
        var barWidth = canvasWidth / fft.size;
        for (var i = 0, len = values.length; i < len; i++){
            var val = values[i] / 255;
            var x = canvasWidth * (i / len);
            var y = val * canvasHeight;
            fftContext.fillStyle = "rgba(0, 0, 0, " + val + ")";
            fftContext.fillRect(x, canvasHeight - y, barWidth, canvasHeight);
        }
    }

    //the waveform data
    var waveContext = $("<canvas>", {
        "id" : "waveform"
    }).appendTo("#Content").get(0).getContext("2d");
    var waveformGradient;

    function drawWaveform(values){
        //draw the waveform
        waveContext.clearRect(0, 0, canvasWidth, canvasHeight);
        var values = waveform.analyse();
        waveContext.beginPath();
        waveContext.lineJoin = "round";
        waveContext.lineWidth = 6;
        waveContext.strokeStyle = waveformGradient;
        waveContext.moveTo(0, (values[0] / 255) * canvasHeight);
        for (var i = 1, len = values.length; i < len; i++){
            var val = values[i] / 255;
            var x = canvasWidth * (i / len);
            var y = val * canvasHeight;
            waveContext.lineTo(x, y);
        }
        waveContext.stroke();
    }

    //size the canvases
    var canvasWidth, canvasHeight;

    function sizeCanvases(){
        canvasWidth = $("#fft").width();
        canvasHeight = $("#fft").height();
        waveContext.canvas.width = canvasWidth;
        fftContext.canvas.width = canvasWidth;
        waveContext.canvas.height = canvasHeight;
        fftContext.canvas.height = canvasHeight;

        //make the gradient
        waveformGradient = waveContext.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        waveformGradient.addColorStop(0, "#ddd");
        waveformGradient.addColorStop(1, "#000");   
    }

    sizeCanvases();
    $(window).resize(sizeCanvases);

    function loop(){
        requestAnimationFrame(loop);
        //get the fft data and draw it
        var fftValues = fft.analyse();
        drawFFT(fftValues);
        //get the waveform valeus and draw it
        var waveformValues = waveform.analyse();
        drawWaveform(waveformValues);
    }
    loop();
}
*/
