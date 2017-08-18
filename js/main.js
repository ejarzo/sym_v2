/* =============================================================================
    
    SHAPE YOUR MUSIC
    
    A web application for composing visually. Shapes are loops, where each side
    is a note. The melodies are determined by the angles between sides.

    Charlie Colony and Elias Jarzombek
    Code written by Elias Jarzombek

    V2: 2017

============================================================================= */
"use strict"
/* --------------------------------- RAPHAEL -------------------------------- */
var r = Raphael("holder", "100%", "100%");

/* --------------------------------- COLORS --------------------------------- */
var colorsList = ["#c9563c", "#f4b549", "#2a548e", "#705498", "#33936b"];
var warningRed  = "rgba(255,100,100,.5)";

/* ------------------------------- ATTRIBUTES ------------------------------- */
/* shapes */
var shapeDefaultAttr        = {opacity: 1};
var shapeHoverAttr          = {"stroke-width": 3};
var shapeFilledAttr         = {opacity: 1};
var shapeWarningAttr        = {fill: warningRed, stroke: warningRed};
var shapeMutedAttr          = {opacity: 0.2};
var completedShapeOpacity   = 0.4;
var previewShapeOpacity     = 0.1;

/* animated circle */
var animCircleAttr          = {"stroke-width": 2, opacity: 1};
var animCircleBangStartAttr = {r: 7, "fill": "#fff"};

/* handles */
var handleRadius = 4;
var handlesWarningAttr = {opacity: 0.2};
var handlesDefaultAttr = {r: handleRadius, "stroke-width": 2};
var handleHoverInAttr = {r: 6, "stroke-width": 3};

/* hover hint */
var hoverCircleAttr   = {"fill": "#ddd", "fill-opacity": .4, "stroke": "#ddd", "stroke-width": 2};
var hoverLineAttr     = {"stroke-width": "2", opacity: 0.5};

/* grid */
var gridDotAttr       = {fill: "#777", "stroke-width": 1, stroke: "#FFF"};


/* --------------------------------- GLOBALS -------------------------------- */

/* ======== AUDIO ===================================================== */
/* "interactive", "playback", "balanced", "fastest"*/
Tone.Transport.latencyHint = 'playback';

var masterMeter = new Tone.Meter("level");
var masterCompressor = new Tone.Compressor({
    "threshold": -12,
    "ratio": 2,
    "attack": 0.5,
    "release": 0.1
});
var masterLimiter = new Tone.Limiter(-6);

var masterFft = new Tone.Analyser("fft", 32);
var masterWaveform = new Tone.Analyser("waveform", 1024);

Tone.Master.chain(masterCompressor, masterLimiter, masterMeter);
masterMeter.fan(masterWaveform);
var PLAYING = false;
/*var synthNamesList =  ["Keys", "colton_08", "Marimba", "colton_12", "Duo", "SubBass", 
                   "Simple", "AM", "SuperSaw", "Membrane", "Kalimba", "Cello", "Pizz"];*/

var synthNameEnum = {}

var DEFAULT_TEMPO = 5;

var SELECTED_INSTCOLOR_ID = 0;
var SELECTED_SHAPE_ID = -1;
//var PRESETS = new Presets();

/* ======== SCALE ===================================================== */
var DEFAULT_KEY = "A3";
var DEFAULT_SCALE = "major";
var NOTE_CHOOSER = note_chooser1;
var tonicsList = ["a", "a#", "b", "c", "c#", "d", "d#", "e", "f", "f#", "g", "g#"];
var keysList = ["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", 
                "locrian", "major pentatonic", "minor pentatonic", "chromatic", 
                "blues", "double harmonic", "flamenco", "harmonic minor", 
                "melodic minor", "wholetone"];
//var tonicsList = teoria.note("a").scale("chromatic").simple();

/* ======== GRID ====================================================== */
var GRID_SIZE = 50;
var GLOBAL_MARGIN = 5;
var gridDots = r.set();

/* ======== TOOLS ====================================================== */
var CURR_TOOL = "draw";         // draw, adjust
var CURR_DRAW_STATE = "ready";  // ready, drawing

/* ======== LINE TO MOUSE ============================================== */
var ORIGIN_RADIUS = 15;
var hoverLine = r.path().attr(hoverLineAttr);
var hoverCircle = r.circle(0,0,3).attr(hoverCircleAttr);

/* ======== RECORDING =====================----========================= */
var rec = new Recorder(masterLimiter);
var RECORD_ARMED = false;
var RECORDING = false;



var alertMessage = "Welcome to Shape Your Music. This application is under development, and currently only works in the Chrome browser :(. Check out the Help menu for a basic tutorial. If you have questions feel free to contact me at ejarz25@gmail.com. Enjoy! - Elias"




/* ========================================================================== */
/* ========================================================================== */
/* -------------------------------- CLASSES --------------------------------- */
/* ========================================================================== */
/* ========================================================================== */


/* ========================================================================== */
/* ------------------------------ Project class ----------------------------- */
/*  
    A Project keeps track of all of the informtaion needed to save/load anything
    the user has created. It has a name, tempo, scale, and root note. 
    Most important is the shapesList, which is an array of the Project's shapes.

*/
class Project {
    constructor (/*proj_obj*/) {
        this.name = "New Project";
        this.tempo = DEFAULT_TEMPO;
        this.scaleObj = teoria.note(DEFAULT_KEY).scale(DEFAULT_SCALE);
        this.rootNote = this.scaleObj.tonic.toString();
        this.synthControllersList = [];
        this.shapesList = [];
        this.instColors = [];
        this.quantizeLength = 700;
    }
    /* ---------- SETTERS ---------- */
    set_tempo (tempo) {
        this.tempo = tempo;
        this.reset_all_notes();
    }
    
    set_scale (name) {
        this.scaleObj = teoria.note(this.rootNote).scale(name);
        this.shapesList.forEach(function (shape) {
            if (shape.isIncluded) {
                shape.update_start_freq();
            }
        });
        this.reset_all_notes();
    }
    
    set_tonic (name) {
        var note = teoria.note(name);
        var currScaleName = this.scaleObj.name;
        this.scaleObj = note.scale(currScaleName);
        this.rootNote = note.toString();
        this.shapesList.forEach(function (shape) {
            if (shape.isIncluded) {
                shape.update_start_freq();
            }
        });
        this.reset_all_notes();
    }

    /* ---------- ACTIONS ---------- */
    init () {
        this.init_tempo();
        this.init_scale_select();
        this.init_tonic_select();
        this.init_synths();
        this.init_inst_colors();
        this.init_color_picker();
    }

    init_tempo () {
        $(".tempo-slider").val(this.tempo * -1);
    }

    init_scale_select () {
        populate_list(keysList, this.scaleObj.name, ".scale-select");
    }

    init_tonic_select () {
        populate_list(tonicsList, this.scaleObj.tonic.toString(true), ".tonic-select");
    }

    /* ====================================================================== */
    /* ======================== INITIALIZE ALL SYNTHS ======================= */
    /* ====================================================================== */

    /* 
        Creates synthController parameters and calls add_synth for each one
     */
    init_synths () {
        /* --------- Defaults -------- */
        var defaultDynamicParams = 
            [{
                name: "glide",
                default: 0.01,
                func: function (shape,val) {
                    shape.synth.set("portamento",scale_val_to_range(val, 0, 101, 0, .8));
                }
            }, {
                name: "attack",
                default: 0.01,
                func: function (shape,val) {
                    shape.synth.envelope.set("attack", scale_val_to_range(val, 0, 101, 0, .8)) + 0.001;
                }
            }, {
                name: "decay",
                default: 0.01,
                func: function (shape,val) {
                    shape.synth.envelope.set("decay", scale_val_to_range(val, 0, 101, 0, 3) + 0.001);
                }  
            }, {
                name: "sustain",
                default: 0.01,
                func: function (shape,val) {
                    shape.synth.envelope.set("sustain", scale_val_to_range(val, 0, 101, 0, 1) + 0.001);
                }
            }];

        /* ------------------------------------------------------------------ */
        /* ------------------------------- AM ------------------------------- */
        /* ------------------------------------------------------------------ */

        /* ------------------------------------------------------------------ */
        /* ------------------------------ KEYS ------------------------------ */
        /* ------------------------------------------------------------------ */
        var keysParams = 
            {
                "portamento": 0,
                "oscillator": {
                    "detune": 0,
                    "type": "custom",
                    "partials" : [2, 1, 2, 2],
                    "phase": 0,
                    "volume": -6
                },
                "envelope": {
                    "attack": 0.005,
                    "decay": 0.3,
                    "sustain": 0.2,
                    "release": 1,
                }
            }
        var keysEffects = 
            [{
                type: Tone.Freeverb,
                params: {
                    "roomSize": 0.8,
                    "dampening": 2000,
                    "wet": 1
                }
            },
            {
                type: Tone.FeedbackDelay,
                params: {
                    "delayTime": .7,
                    "feedback": .8,
                    "wet": 1
                }
            }]
        var keysDynamicParams = 
            [{
                name: "glide",
                default: 0,
                func: function (shape,val) {
                    var newVal =  scale_val_to_range(val, 0, 101, 0, .2);
                    shape.synth.set("portamento",newVal);
                }
            }, 
            {
                name: "attack",
                default: scale_val_to_range(keysParams.envelope.attack, 0, 1, 0, 100),
                func: function (shape,val) {
                    shape.synth.envelope.set("attack", scale_val_to_range(val, 0, 101, 0, 1)+0.005);
                }
            }, 
            {
                name: "space",
                default: 10,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 0, "wet");
                }  
            }, 
            {
                name: "delay",
                default: 5,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 1, "wet");
                }
            }];

        /* ------------------------------------------------------------------ */
        /* ------------------------------- DUO ------------------------------ */
        /* ------------------------------------------------------------------ */
        var duoEffects = 
            [{
                type: Tone.Chorus,
                params: {
                    frequency: 1.5,
                    delayTime: 3.5,
                    depth: 0.9,
                    feedback: 0.1,
                    type: "sine",
                    spread: 180
                }
            }]
        var duoDynamicParams = 
            [{
                name: "glide",
                default: 0,
                func: function (shape,val) {
                    shape.synth.set("portamento", scale_val_to_range(val, 0, 101, 0, .5));
                }
            }, {
                name: "chorus",
                default: 20,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 0, "wet"); 
                }
            }, {
                name: "vibrato",
                default: 10,
                func: function (shape,val) {
                    shape.synth.set("vibratoAmount", scale_val_to_range(val, 0, 101, 0, 1));
                }  
            }, {
                name: "harmonicity",
                default: scale_val_to_range(1.5, 0, 3, 0, 100),
                func: function (shape,val) {
                    shape.synth.set("harmonicity", scale_val_to_range(val, 0, 101, 0, 3));
                }
            }];

        /* ------------------------------------------------------------------ */
        /* ----------------------------- Marimba ---------------------------- */
        /* ------------------------------------------------------------------ */
        var marimbaParams = 
            {
                "portamento": 0,
                "oscillator": {
                    "partials": [1,0,2,0,3]
                },
                "envelope": {
                    "attack": 0.001,
                    "decay": 1.2,
                    "sustain": 0,
                    "release": 1.2
                }}
        var marimbaDynamicParams =
            [{
                name: "glide",
                default: scale_val_to_range(marimbaParams.portamento, 0, 1, 0, 100),
                func: function (shape,val) {
                    shape.synth.set("portamento",scale_val_to_range(val, 0, 101, 0, .8));
                }
            }, {
                name: "attack",
                default: scale_val_to_range(marimbaParams.envelope.attack, 0, 2, 0, 100),
                func: function (shape,val) {
                    shape.synth.envelope.set("attack", scale_val_to_range(val, 0, 101, 0, .8)) + 0.01;
                }
            }, {
                name: "decay",
                default: scale_val_to_range(marimbaParams.envelope.decay, 0, 2, 0, 100),
                func: function (shape,val) {
                    shape.synth.envelope.set("decay", scale_val_to_range(val, 0, 101, 0, 3) + 0.01);
                }  
            }, {
                name: "sustain",
                default: scale_val_to_range(marimbaParams.envelope.sustain, -100, 0, 0, 100),
                func: function (shape,val) {
                    shape.synth.envelope.set("sustain", scale_val_to_range(val, 0, 101, 0, 1) + 0.01);
                }
            }];

        /* ------------------------------------------------------------------ */
        /* ---------------------------- SubBass ---------------------------- */
        /* ------------------------------------------------------------------ */
        var subBassParams = 
            {
                "portamento": 0.08,
                "oscillator": {
                    "partials": [2, 1, 3, 2, 0.4],
                    "volume": -6
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
                }}
        var subBassEffects = 
            [{
                type: Tone.Distortion,
                params: {
                    "distortion": 0.9,
                }
            },
            {
                type: Tone.Freeverb,
                params: {
                    "roomSize": .3,
                    "dampening": 1500,
                    "wet": 1
                }
            }]
        var subBassDynamicParams = 
            [{
                name: "glide",
                default: scale_val_to_range(0.08, 0, 1, 0, 100),
                func: function (shape,val) {
                    var newVal =  scale_val_to_range(val, 0, 101, 0, .2);
                    shape.synth.set("portamento",newVal);
                }
            }, 
            {
                name: "attack",
                default: 1,
                func: function (shape,val) {
                    shape.synth.envelope.set("attack", scale_val_to_range(val, 0, 101, 0, 1)+0.005);
                }
            }, 
            {
                name: "fuzz",
                default: 10,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 0, "wet");           
                }  
            }, 
            {
                name: "space",
                default: 10,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 1, "wet"); 
                }
            }];

        /* ------------------------------------------------------------------ */
        /* --------------------------- Super Saw ---------------------------- */
        /* ------------------------------------------------------------------ */
        var superSawParams = {
                "filter": {
                    "frequency": 200,
                    "Q": 4,
                    "type": "lowpass",
                    "rolloff": -48
                },
                "vibratoAmount":1,
                "vibratoRate":5,
                "oscillator" : {
                    "type" : "fatsawtooth",
                    "count" : 3,
                    "spread" : 30
                },
                "envelope": {
                    "attack": 0.01,
                    "decay": 0.1,
                    "sustain": 0.5,
                    "release": 0.1,
                    "attackCurve" : "exponential"
                }}
        var superSawEffects = 
            [{
                type: Tone.Filter,
                params: {
                    type : "lowpass",
                    frequency: 1500,
                    Q: 5,
                    wet: 1,
                }
            },
            {
                type: Tone.JCReverb,
                params: {
                        roomSize: .6,
                        wet: 1,
                    }
            }]
        var superSawDynamicParams = 
            [{
                name: "glide",
                default: 0,
                func: function (shape,val) {
                    var newVal =  scale_val_to_range(val, 0, 101, 0, .5);
                    shape.synth.set("portamento",newVal);
                }
            }, 
            {
                name: "attack",
                default: scale_val_to_range(keysParams.envelope.attack, 0, 1, 0, 100),
                func: function (shape,val) {
                    shape.synth.envelope.set("attack", scale_val_to_range(val, 0, 101, 0, 2))+0.005;
                }
            }, 
            {
                name: "brightness",
                default: 100,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 0, "frequency");
                }  
            }, 
            {
                name: "space",
                default: 0,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 1, "wet");
                }                 
            }];
        
        /* ------------------------------------------------------------------ */
        /* ------------------------------ Simple ---------------------------- */
        /* ------------------------------------------------------------------ */
        var simpleParams = 
            {
                oscillator:{
                    type:"triangle"
                },
                envelope:{
                    attack:0.01,
                    decay:0.1,
                    sustain:0.3,
                    release:0
                }
            }
        var simpleDynamicParams = 
            [{
                name: "glide",
                default: 0,
                func: function (shape,val) {
                    shape.synth.set("portamento",scale_val_to_range(val, 0, 101, 0, .8));
                }
            }, {
                name: "attack",
                default: scale_val_to_range(simpleParams.envelope.attack, 0, .8, 0, 100),
                func: function (shape,val) {
                    shape.synth.envelope.set("attack", scale_val_to_range(val, 0, 101, 0, .8)) + 0.001;
                }
            }, {
                name: "decay",
                default: scale_val_to_range(simpleParams.envelope.decay, 0, 1, 0, 100),
                func: function (shape,val) {
                    shape.synth.envelope.set("decay", scale_val_to_range(val, 0, 101, 0, 3) + 0.001);
                }  
            }, {
                name: "sustain",
                default: scale_val_to_range(simpleParams.envelope.sustain, 0, 1, 0, 100),
                func: function (shape,val) {
                    shape.synth.envelope.set("sustain", scale_val_to_range(val, 0, 101, 0, 1) + 0.001);
                }
            }];

        /* ------------------------------------------------------------------ */
        /* ---------------------------- Membrane ---------------------------- */
        /* ------------------------------------------------------------------ */
        var membraneParams =
            {
                pitchDecay:0.05,
                octaves:10,
                oscillator:{
                    type:"sine"
                },
                envelope:{
                    attack:0.001,
                    decay:0.4,
                    sustain:0.01,
                    release:0,
                    attackCurve:"exponential"
                }
            }
        var membraneEffects = 
            [{
                type: Tone.Chebyshev,
                params: {
                    order : 20,
                }
            },
            {
                type: Tone.Filter,
                params: {
                    type : "lowpass",
                    frequency: 1500,
                    Q: 5,
                    wet: 1
                },
            }]
        var membraneDynamicParams =
            [{
                name: "glide",
                default: 50,
                func: function (shape,val) {
                    shape.synth.set("octaves",scale_val_to_range(val, 0, 101, 2, 10));
                }
            }, {
                name: "decay",
                default: 15,
                func: function (shape,val) {
                    shape.synth.envelope.set("decay", scale_val_to_range(val, 0, 101, 0, 3) + 0.001);
                }  
            }, {
                name: "distortion",
                default: scale_val_to_range(simpleParams.envelope.attack, 0, .8, 0, 100),
                func: function (shape,val) {
                    shape.set_effect_amount(val, 0, "wet");
                }
            }, {
                name: "brightness",
                default: 100,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 1, "frequency");
                }  
            }];
        /* ------------------------------------------------------------------ */
        /* ----------------------------- Kalimba ---------------------------- */
        /* ------------------------------------------------------------------ */
        var kalimbaParams = 
            {
                "harmonicity": 8,
                "modulationIndex": 2,
                "oscillator": {
                    "type": "sine"
                },
                "envelope": {
                    "attack": 0.001,
                    "decay": 2,
                    "sustain": 0.1,
                    "release": 2
                },
                "modulation" : {
                    "type" : "square"
                },
                "modulationEnvelope" : {
                    "attack": 0.002,
                    "decay": 0.2,
                    "sustain": 0,
                    "release": 0.2
                }
            }

        /* ------------------------------------------------------------------ */
        /* ----------------------------- Cello ------------------------------ */
        /* ------------------------------------------------------------------ */
        var celloParams = 
            {
                "harmonicity": 3.01,
                "modulationIndex": 14,
                "oscillator": {
                    "type": "triangle"
                },
                "envelope": {
                    "attack": 0.2,
                    "decay": 0.3,
                    "sustain": 0.1,
                    "release": 1.2
                },
                "modulation" : {
                    "type": "square"
                },
                "modulationEnvelope" : {
                    "attack": 0.01,
                    "decay": 0.5,
                    "sustain": 0.2,
                    "release": 0.1
                }
            }
        var celloEffects = 
            [{
                type: Tone.Freeverb,
                params: {
                    roomSize: 0.8,
                    dampening: 5000
                }
            },
            {
                type: Tone.Vibrato,
                params: {
                    "maxDelay" : 0.01,
                    "frequency" : 5,
                    "depth" : 0.1,
                    "type" : "sine"
                }
            }
            ]
        var celloDynamicParams = 
            [{
                name: "attack",
                default: scale_val_to_range(0.2, 0, 1, 0, 100),
                func: function (shape,val) {
                    shape.synth.envelope.set("attack", scale_val_to_range(val, 0, 101, 0, 1)+0.01);
                }
            },
            {
                name: "decay",
                default: scale_val_to_range(0.3, 0, 2, 0, 100),
                func: function (shape,val) {
                    var newVal =  scale_val_to_range(val, 0, 101, 0, 2) + 0.01;
                    shape.synth.envelope.set("decay", newVal);
                }
            },
            {
                name: "space",
                default: 25,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 0, "wet");                      
                }  
            }, 
            {
                name: "vibrato",
                default: 15,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 1, "depth", 0, 0.2);
                }
            }];
        
        /* ------------------------------------------------------------------ */
        /* ------------------------------- Pizz ----------------------------- */
        /* ------------------------------------------------------------------ */
        var pizzParams = 
            {
                "oscillator": {
                    "type": "sawtooth",
                    "volume": -6,
                },
                "filter": {
                    "Q": 3,
                    "type": "highpass",
                    "rolloff": -12
                },
                "envelope": {
                    "attack": 0.01,
                    "decay": 0.3,
                    "sustain": 0,
                    "release": 0.9
                },
                "filterEnvelope": {
                    "attack": 0.01,
                    "decay": 0.1,
                    "sustain": 0,
                    "release": 0.1,
                    "baseFrequency": 800,
                    "octaves": -1.2
                }
            }
        var pizzEffects = 
            [{
                type: Tone.Freeverb,
                params: {
                    "roomSize": 0.7,
                    "dampening": 5000,
                    "wet": 1
                }
            },
            {
                type: Tone.FeedbackDelay,
                params: {
                    "delayTime": .1,
                    "feedback": .3,
                    "wet": 1
                }
            }]
        var pizzDynamicParams = 
            [{
                name: "attack",
                default: scale_val_to_range(0.01, 0, 1, 0, 100),
                func: function (shape,val) {
                    shape.synth.envelope.set("attack", scale_val_to_range(val, 0, 101, 0, 1)+0.01);
                }
            },
            {
                name: "decay",
                default: scale_val_to_range(0.3, 0, 2, 0, 100),
                func: function (shape,val) {
                    var newVal =  scale_val_to_range(val, 0, 101, 0, 2) + +.01;
                    shape.synth.envelope.set("decay", newVal);
                }
            },
            {
                name: "space",
                default: 50,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 0, "wet");                      
                }  
            }, 
            {
                name: "delay",
                default: 50,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 1, "wet");           
                }
            }];
        
        /* ------------------------------------------------------------------ */
        /* --------------------------- COLTON 12 ---------------------------- */
        /* ------------------------------------------------------------------ */
        var colton12Params = {
                "pitchDecay": 1,
                "octaves": 30,
                "oscillator": {
                    "type": "sine"
                },
                "envelope": {
                    "attack": 0.001,
                    "decay": 2,
                    "sustain": 0.001,
                    "release": 1.4,
                    "attackCurve": "exponential"
                }}
        var colton12Effects = [
            {
                type: Tone.Chebyshev,
                params: {
                    "order" : 50,
                    "wet": 1
                }
            },
            {
                type: Tone.FeedbackDelay,
                params: {
                    feedback: 0.3
                }
            }]
        var colton12DynamicParams = [
            {
                name: "glide",
                default: 100,
                func: function (shape,val) {
                    shape.synth.set("pitchDecay", scale_val_to_range(val, 0, 101, 0, 1));
                }
            }, 
            {
                name: "zip",
                default: 100,
                func: function (shape,val) {
                    shape.synth.set("octaves", scale_val_to_range(val, 0, 101, 2, 30));
                }
            }, 
            {
                name: "zap",
                default: 50,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 0, "wet");
                }  
            }, 
            {
                name: "delay",
                default: 0,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 1, "wet");
                }
            }];
        
        /* ------------------------------------------------------------------ */
        /* ---------------------------- COLTON 08 --------------------------- */
        /* ------------------------------------------------------------------ */
        var colton08Params = {
                vibratoAmount:0,
                vibratoRate:10,
                harmonicity:3,
                voice0: {
                    volume:-10,
                    portamento:0,
                    oscillator:{
                        type:"sine"
                    },
                    filterEnvelope: {
                        attack:0,
                        decay:0,
                        sustain:0,
                        release:0,
                    },
                    envelope: {
                        attack:0.5,
                        decay:2,
                        sustain:2,
                        release:1,
                    },
                },
                voice1:{
                    volume:-10,
                    portamento:0,
                    oscillator: {
                        type:"sine"
                    },
                    filterEnvelope: {
                        attack:0,
                        decay:0,
                        sustain:0,
                        release:0,
                    },
                    envelope: {
                        attack:0.01,
                        decay:2,
                        sustain:0,
                        release:2,
                    },
                }}
        var colton08Effects = [
            {
                type: Tone.Chorus,
                params: {
                    frequency : 1,
                    delayTime : 2,
                    depth : 20,
                    feedback : 0.1,
                    type : "square",
                    spread : 80
                }
            }, 
            {
                type: Tone.Distortion,
                params: {
                    distortion : .9,
                }
            }]
        var colton08DynamicParams = [
            {
                name: "attack",
                default: 1,
                func: function (shape,val) {
                    var val = scale_val_to_range(val, 0, 101, 0, 1) +0.001;
                    shape.synth.voice0.envelope.set("attack", val);
                    shape.synth.voice1.envelope.set("attack", val);
                }
            }, 
            {
                name: "vibrato",
                default: 25,
                func: function (shape,val) {
                    shape.synth.set("vibratoAmount",scale_val_to_range(val, 0, 101, 0, 1) +0.001);
                }
            }, 
            {
                name: "perc",
                default: 50,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 0, "wet");            
                }  
            }, 
            {
                name: "fuzz",
                default: 0,
                func: function (shape,val) {
                    shape.set_effect_amount(val, 1, "wet");             
                }
            }];
        
        /* ------------------------------------------------------------------ */
        /* ----------------------------- ADD ALL ---------------------------- */
        /* ------------------------------------------------------------------ */

        //this.add_synth("AM", Tone.AMSynth, {}, defaultDynamicParams);
        
        this.add_synth("Keys", Tone.Synth, keysParams, keysDynamicParams, keysEffects);
        this.add_synth("Duo", Tone.DuoSynth, {}, duoDynamicParams, duoEffects);
        
        this.add_synth("Cello", Tone.FMSynth, celloParams, celloDynamicParams, celloEffects);
        //this.add_synth("Marimba", Tone.Synth, marimbaParams, marimbaDynamicParams);
        
        this.add_synth("SubBass", Tone.MonoSynth, subBassParams, subBassDynamicParams, subBassEffects);
        this.add_synth("SuperSaw", Tone.MonoSynth, superSawParams, superSawDynamicParams, superSawEffects);
        this.add_synth("Simple", Tone.Synth, simpleParams, simpleDynamicParams);
        
        this.add_synth("Membrane", Tone.MembraneSynth, {}, membraneDynamicParams, membraneEffects);
        //this.add_synth("Kalimba", Tone.FMSynth, kalimbaParams, defaultDynamicParams);
        
        this.add_synth("Pizz", Tone.MonoSynth, pizzParams, pizzDynamicParams, pizzEffects);
        
        this.add_synth("colton_12", Tone.MembraneSynth, colton12Params, colton12DynamicParams, colton12Effects);
        this.add_synth("colton_08", Tone.DuoSynth, colton08Params, colton08DynamicParams, colton08Effects);

    }

    /* 
        Adds a synth to the synthControllers list.  Each new controller has a name, 
        a Tone synth type, synth options in JSON, dynamic parameters that have a name, 
        default value, and function to execute, and a list of effects
    */
    add_synth (name, baseType, baseParams, dynamicParamObjs, effects) {
        var synthController = new SynthController(name, baseType, baseParams, dynamicParamObjs, effects);
        synthNameEnum[name] = this.synthControllersList.length;
        this.synthControllersList.push(synthController);
    }

    /*
        Initializes the instColors. There are as many as there are colors in colorsList
    */
    init_inst_colors () {
        for (var i = 0; i < colorsList.length; i++) {
            var instColor = new InstColor(i, this.synthControllersList[i].name, colorsList[i]);
            this.instColors.push(instColor);
        }
    }
    
    init_color_picker(){
        var colorPicker = $(".color-palette .dropdown-content .palette-background");
        var colorPickerHtml = "";
        for (var i = 0; i < this.instColors.length; i++) {
            colorPicker.append('<div class="palette-color inst-color'+i+'" onclick="set_draw_inst_color('+i+')"></div>');
            $(".palette-color.inst-color"+i).css("background", this.instColors[i].color);
        }
    }
    
    /*
        clears the canvas by: stopping playback, removine each shape, resetting 
        the grid and shapesList, changing tool to draw
    */
    clear_canvas () {
        // TODO memory
        hide_details();
        stop_handler();
        this.shapesList.forEach(function (shape) {
            if (shape.isIncluded) {
                shape.unmute();
                shape.delete();    
            }
        });
        $(".shape-attr-popup").remove();
        
        //Tone.context.close()
        //Tone.context = new AudioContext();

        r.clear();
        init_grid();
        //Tone.dispose();
        this.shapesList.length = 0;
        
        ACTIVE_SHAPE = new Shape(0, SELECTED_INSTCOLOR_ID);
        var color = PROJECT.instColors[SELECTED_INSTCOLOR_ID].color;

        hoverLine = r.path().attr(hoverLineAttr).attr("stroke", color);
        hoverCircle = r.circle(0,0,3).attr(hoverCircleAttr).attr({"stroke": color, "fill": color});
        
        if (CURR_TOOL == "adjust") {
            hoverCircle.hide();
        }
        
        select_tool("draw");
        console.log(this.shapesList);
    }

    /*
        Sets all notes for each shape.
    */
    reset_all_notes () {
        this.shapesList.forEach(function (shape) {
            if (shape.isIncluded) {
                shape.update_note_values();
            }
        });
    }

    /* ---------- I/O ---------- */

    /*
        returns a project object that contains neccessary data about the project
    */
    dump () {
        var savedShapesList = []; 
        this.shapesList.forEach(function (shape) {
            if (shape.isIncluded) {
                var coords = []
                shape.nodes.forEach(function (node) {
                    //var p = {
                    //    x: node.getX(),
                    //    y: node.getY(),
                    //}
                    coords.push(node.getCoords());
                })

                var shapeData = {
                    pathList: coords,
                    startFreqIndex: shape.startFreqIndex,
                    volume: shape.volume,
                    isMuted: shape.isMuted,
                    instColorId: shape.instColorId
                }
                
                savedShapesList.push(shapeData);
            }
        })
        var savedInstColorNames = [];
        this.instColors.forEach(function (instColor) {
            savedInstColorNames.push(instColor.name);
        })
        var projObj = {
            tempo: this.tempo,
            tonic: this.scaleObj.tonic.toString(),
            scaleName: this.scaleObj.name,
            shapesList: savedShapesList,
            instColorNames: savedInstColorNames
        }
        console.log("proj obj:", projObj);
        return projObj;
    }

    /*
        Loads data from a project object into the project: draws the shapes and 
        updates the tempo, musical properties etc
    */
    load (projObj) {
        console.log("Loading Project:", projObj);

        this.clear_canvas();
        this.tempo = projObj.tempo;
        this.set_tempo(this.tempo);
        this.scaleObj = teoria.note(projObj.tonic).scale(projObj.scaleName);
        this.rootNote = this.scaleObj.tonic.toString();
        
        this.instColors.length = 0;
        $(".inst-option").remove();
        
        for (var i = 0; i < projObj.instColorNames.length; i++) {
            var newInstColor = new InstColor(i, projObj.instColorNames[i], colorsList[i]);
            this.instColors.push(newInstColor);
        }

        console.log("LOADED:", this.instColors);
        
        for (var i = 0; i < projObj.shapesList.length; i++) {
            var shapeData = projObj.shapesList[i];
            var newShape = new Shape (i, 0, shapeData);
            newShape.set_inst_color_id(shapeData.instColorId)
            newShape.update_note_values();

            var center = newShape.get_center();
            newShape.startFreqIndex = y_coord_to_index(center.y);
            newShape.update_start_freq();

            newShape.update_note_values();
            newShape.set_pan(center.x);
            
            this.shapesList.push(newShape);
        }
        this.reset_all_notes();
        ACTIVE_SHAPE.id = this.shapesList.length;

        this.init_tempo();
        this.init_tonic_select();
        this.init_scale_select();
    }
}

/* ========================================================================== */
/* ------------------------------- Shape class ------------------------------ */
/*
    A Shape is a representation of a melody. The most important properties are
    the path and the part. The path is the 2D shape drawn by the user that can
    be dragged and clicked on. The part (Tone.part) is the melody. It executes
    for every side of the path. Shapes are created with an Id, an instcolorId 
    that tells it what color to be, and optionally saved data - to load a shape
    from a given path.
*/
class Shape {
    constructor (id, instColorId, savedData) {
        var parent = this;
        this.id = id;

        /* ============== internal helpers ============== */
        /* ----- Drag ----- */
        this.start = function () {
            if (CURR_TOOL == "adjust") {
                this.odx = 0;
                this.ody = 0;
                this.drag = false;
            }
        },
        this.move = function (dx, dy) {
            if (CURR_TOOL == "adjust") {
                dx = snap_to_grid(dx);
                dy = snap_to_grid(dy);

                var xDiff = (dx - this.odx);
                var yDiff = (dy - this.ody);

                var tempPath = parent.path.attr("path");

                // move shape path and handles
                for (var i = 0; i < tempPath.length - 1; i++) {
                    var p = parent.nodes[i].getCoords();
                    var newX = p.x + xDiff;
                    var newY = p.y + yDiff;

                    // move vertex handle
                    parent.nodes[i].handle.attr({"cx": newX, "cy": newY});

                    // move actual vertex in path
                    tempPath[i][1] += xDiff;
                    tempPath[i][2] += yDiff;
                }

                // set anim circle translations
                parent.path.attr("path", tempPath);
                parent.animCircle.translate(xDiff, yDiff);

                this.odx = dx;
                this.ody = dy;
                this.drag = true;

                // update pan and starting note based on new position
                var center = parent.get_center();
                parent.set_pan(center.x);
                parent.startFreqIndex = y_coord_to_index(center.y);
            }
        },
        this.up = function (e) {
            if (this.drag == false && CURR_TOOL == "adjust") {
                e.stopPropagation();
                parent.show_attr_popup(e);
            }
            parent.update_start_freq();
            if (parent.isCompleted) {
                parent.update_note_values();    
            }
            this.odx = this.ody = 0;
        };
        
        /* ----- Hover ----- */
        this.hoverIn = function () {
            return function (event) {
                if (CURR_TOOL == "adjust") {
                    var currStrokeWidth = parent.path.attr("stroke-width") + 2;
                    parent.path.attr("stroke-width", currStrokeWidth);
                }
            };
        };
        this.hoverOut = function () {
            return function (event) {
                parent.path.attr("stroke-width", vol_to_stroke_width(parent.volume));
            };
        };

        /* ----- Handles ----- */
        this.hide_handles = function () {
            for (var i = this.nodes.length - 1; i >= 1; i--) {
                this.nodes[i].hide();
            }
        }
        this.show_handles = function () {
            for (var i = this.nodes.length - 1; i >= 0; i--) {
                this.nodes[i].show();
            }
        }

        /* ----- Show the popup ----- */
        this.show_attr_popup = function (event) {
            SELECTED_SHAPE_ID = this.id;
            this.path.attr({"fill-opacity": 0.9});
            
            var xPad = 23;
            var yPad = 43;
            var x = event.clientX;
            var y = event.clientY;
            var i = parent.id;

            var holderWidth = $("#holder").width();
            var holderHeight = $("#holder").height();
            
            var toolTipArrow = this.popup.find(".tooltip-arrow");
            this.popup.css({left: x+xPad, top: y-yPad});

            // make sure always on screen
            if (x + this.popup.width() + xPad > holderWidth) {
                toolTipArrow.removeClass("arrow-left");
                toolTipArrow.addClass("arrow-right");
                this.popup.css({left: x-(this.popup.width() + 2*xPad)});
            } else {
                toolTipArrow.removeClass("arrow-right");
                toolTipArrow.addClass("arrow-left");
            }
            if (y + this.popup.height() > holderHeight + 40) {
                this.popup.css({top: holderHeight-this.popup.height()});
                var distFromBottom = holderHeight-y + 10;
                toolTipArrow.css("top", "calc(100% - "+distFromBottom+"px)");
            } else {
                toolTipArrow.css("top", "40px");
            }
            
            this.refresh_shape_attr_popup();
            this.popup.show();
        }

        /* ----- Delete ----- */
        this.delete = function () {
            this.popup.remove();
            
            this.stop();
            this.path.remove();
            
            this.part.removeAll();
            this.part.dispose();

            this.synth.dispose();
            this.nodes.forEach(function (node) {
                node.handle.remove();
            });

            this.isIncluded = false;
        }
        
        /* ----- Mute ----- */
        this.mute = function () {
            console.log("mute");
            this.synth.triggerRelease();
            this.isMuted = true;
            this.synth.volume.value = -Infinity;
            this.part.mute = true;
            this.path.attr({"opacity": 0.3});
            this.nodes.forEach(function (node) {
                node.handle.attr(shapeMutedAttr);
            });
            this.animCircle.attr(shapeMutedAttr);
        
            var unmuteHtml = '<button class="shape-attr-mute shape-attr-unmute">Unmute</button>';
            this.popup.find(".mute-button-cont").html(unmuteHtml);
        }
        this.unmute = function () {
            console.log("unmute");
            this.isMuted = false;
            this.part.mute = false;
            this.path.attr({"opacity": 1});
            
            this.nodes.forEach(function (node) {
                node.handle.attr(handlesDefaultAttr);
                node.handle.attr("opacity", 1);
            });
            this.animCircle.attr("opacity", 1);
            this.synth.volume.value = this.volume;
            
            var muteHtml = '<button class="shape-attr-mute">Mute</button>';
            this.popup.find(".mute-button-cont").html(muteHtml);
        }

        /* ----- Solo ----- */
        this.solo = function () {
            this.isSoloed = true;
            PROJECT.shapesList.forEach(function (shape) {
                if (shape.id != parent.id && shape.isIncluded && !shape.isMuted) {
                    shape.isMutedFromSolo = true;
                    shape.mute();
                }
            });
            var unsoloHtml = '<button class="shape-attr-solo shape-attr-unsolo">Unsolo</button>';
            this.popup.find(".solo-button-cont").html(unsoloHtml);
        }
        this.unsolo = function () {
            this.isSoloed = false;
            PROJECT.shapesList.forEach(function (shape) {
                if (shape.i != parent.id && shape.isIncluded) {
                    if (shape.isMutedFromSolo) {
                        shape.isMutedFromSolo = false;
                        shape.unmute();
                    }
                }
            });
            var soloHtml = '<button class="shape-attr-solo">Solo</button>';
            this.popup.find(".solo-button-cont").html(soloHtml);
        }

        /* ============== variables and attributes ============== */
        
        // inst-color
        this.instColorId = instColorId;
        this.get_inst_color = function () {return PROJECT.instColors[this.instColorId]};

        // style attributes
        this.shapeDefaultAttr = {fill: hex_to_Rgba(this.get_inst_color().color, 0.4), stroke: this.get_inst_color().color};
        this.animCircleAttr = {opacity: 1, fill: this.get_inst_color().color, stroke: this.get_inst_color().color, "stroke-width": 2};
        
        // tone
        this.synth;
        this.volume = -8;

        this.pan = 0;        
        this.panner = new Tone.Panner(this.pan);

        this.isMuted = false;
        this.isMutedFromSolo = false;
        this.isSoloed = false;

        this.quantizeFactor = 1;

        // path
        this.path = r.path().attr(this.shapeDefaultAttr);
        this.path.attr("stroke-width", vol_to_stroke_width(this.volume));
        this.getPerim = function () {return this.path.getTotalLength()};
        this.path.hover(this.hoverIn(), this.hoverOut());
        this.path.drag(this.move, this.start, this.up);

        // nodes
        this.nodes = [];

        // properties
        this.length = function () {return (this.path.attr("path")).length};
        this.startFreqIndex = 0;
        this.startFreq;
        this.isCompleted = false;
        this.isIncluded = true;

        // animation
        this.animCircle = r.circle(0, 0, 5).attr(this.animCircleAttr).toFront().hide();

        /* ============== load from saved shape ============== */
        if (savedData) {
            var pathList = savedData.pathList;

            this.isCompleted = true;
            this.startFreqIndex = savedData.startFreqIndex;

            this.volume = savedData.volume;
            this.path.attr("stroke-width", vol_to_stroke_width(this.volume));

            var pathString = "M" + pathList[0].x + "," + pathList[0].y
            var firstNode = new Node(pathList[0].x, pathList[0].y, 1, id);
            this.nodes.push(firstNode);

            for (var i = 1; i < pathList.length; i++) {
                pathString += "L" + pathList[i].x + "," + pathList[i].y
                var newNode = new Node(pathList[i].x, pathList[i].y, i+1, id);
                this.nodes.push(newNode);
            }

            this.set_pan(this.get_center().x);
            
            pathString += "Z";
            this.path.attr("path", pathString);
            this.id = id;
            this.path.attr(shapeFilledAttr);
        }
        
        this.popup = $("<div>", {"id": "shape-attr-popup-"+this.id, "class": "shape-attr-popup"}).html(this.get_popup_content());
        $("body").append(this.popup);

        this.set_instrument(this.get_inst_color().name);
        this.update_start_freq();


        /* ============================================================= */
        /* ======================= PART CALLBACK ======================= */
        /* ============================================================= */
        this.part = new Tone.Part(function (time, value) {
            if (parent.isCompleted) {
                //parent.synth.connect(parent.panner);
                //var thisSynth = parent.synth;
                //thisSynth.connect(filter);
                if (parent.isMuted) {
                    parent.synth.volume.value = -Infinity;
                } else {
                    parent.synth.volume.value = parent.volume;
                }

                parent.animCircle.show().toFront();
                
                var duration = value.dur;
                var lengthToMiliseconds = (value.noteDur * 1000).toFixed(9);
                
                var note = value.noteVal;
                if (parent.get_inst_color().name == "SubBass") {
                    var oct = teoria.note(note).octave() - 2;
                    var noteName = teoria.note(note).toString().slice(0,-1);
                    note = noteName + oct;
                }
                console.log("note:", note);

                // animation
                Tone.Draw.schedule(function () {
                    var startP = value.nodeFrom.getCoords();
                    var endP = value.nodeTo.getCoords();
                    var transformObj = parent.animCircle.matrix.split();
                    var parentColor = parent.get_inst_color().color;

                    // move to start
                    parent.animCircle.attr({cx : startP.x - transformObj.dx, cy : startP.y - transformObj.dy})
                    
                    // animate to next
                    parent.animCircle.animate({"cx": endP.x  - transformObj.dx, "cy": endP.y - transformObj.dy}, lengthToMiliseconds);


                    parent.animCircle.animate(animCircleBangStartAttr, 0, "linear", function () {
                        this.animate({"fill": parentColor, r: 3, stroke: parentColor}, 800, "ease-out");
                    });
                    parent.path.animate(animCircleBangStartAttr, 0, "linear", function () {
                        this.animate({"fill": parentColor}, 800, "ease-out");
                    });
                }, time)

                parent.synth.triggerAttackRelease(note, duration, time);
            }
        }, []).start(0);
        this.part.loop = true;
        

        /* ============== Popup Handlers ============== */

        /* ------ Instrument Select ------ */        
        this.popup.find(".palette-color").on("click", function () {
            var colorId = $(this).attr("data");
            console.log(colorId);
            parent.set_inst_color_id(colorId);
        })

        /* ------ Starting Frequency ------ */
        this.popup.find(".arrow-up").on("click", function () {
            parent.increment_start_freq(1);
        })

        this.popup.find(".arrow-down").on("click", function () {
            parent.increment_start_freq(0);
        })
        
        /* ------ Volume ------ */
        this.popup.find(".signal-meter").on('change mousemove', function () {
            parent.set_volume(this.value);
        });
        
        /* ------ Toggle Mute  ------ */
        this.popup.find(".mute-button-cont").on('click', function () {
            console.log('asdf');
            if (parent.isMuted) {
                parent.unmute();
            } else {
                parent.mute();
            }
        });

        /* ------ Toggle Solo ------ */
        this.popup.find(".solo-button-cont").on('click', function () {
            if (parent.isSoloed) {
                parent.unsolo();
            } else {
                parent.solo();
            }
        });
        
        /* ------ Position ------ */
        this.popup.find(".shape-attr-tofront").on('click', function () {
            parent.path.toFront();
            parent.animCircle.toFront();
            parent.nodes.forEach(function (node) {
                node.handle.toFront();
            })
        });
        this.popup.find(".shape-attr-toback").on('click', function () {
            parent.nodes.forEach(function (node) {
                node.handle.toBack();
            })
            parent.animCircle.toBack();
            parent.path.toBack();
            gridDots.toBack();
        });

        /* ------ Size ------ */
        this.popup.find(".shape-attr-double").on('click', function () {
            parent.set_quantize_length(2);
            parent.refresh_shape_attr_popup();
        });
        this.popup.find(".shape-attr-half").on('click', function () {
            parent.set_quantize_length(0.5);
            parent.refresh_shape_attr_popup();
        });

        /* ------ Delete ------ */
        this.popup.find(".shape-attr-delete-shape").on("click", function () {
            parent.delete();
        });
        
        /* ------ Set Perimeter ------ */
        this.popup.find(".shape-attr-set-perim").on("click", function () {
            parent.set_perim_length(PROJECT.quantizeLength * parent.quantizeFactor);
        });
    }

    /* ---- SETTERS ---- */

    /* completes the shape. Finishes the path, and calls functions to set note 
        values, pan, and starting note. */
    complete () {
        this.path.attr("path", path_to_string(this.path) + "Z");
        this.path.attr({"fill-opacity": completedShapeOpacity});
        
        var center = this.get_center();
        this.startFreqIndex = y_coord_to_index(center.y);
        this.update_start_freq();

        this.update_note_values();
        this.set_pan(center.x);
        
        if (PROJECT.isAutoQuantized) {
            this.set_perim_length(PROJECT.quantizeLength);
        }

        this.init_effect_vals(this.get_inst_color().name);

        this.isCompleted = true;
        this.refresh_shape_attr_popup();
    }

    init_effect_vals (name) {
        var synthController = name_to_synth_controller(name)
        for (var i = 0; i < 4; i++) {
            var val = PROJECT.instColors[this.instColorId].get_knob_val(i);
            synthController.dynamicParamObjs[i].func(this, val);
        }
    }

    set_effect_amount (val, effectId, paramName, customMin, customMax) {
        val = ~~val;
        var rangeMin = customMin;
        var rangeMax = customMax;
        
        if (paramName == "wet") {
            rangeMin = 0;
            rangeMax = 1;
        }

        // TODO logs
        if (paramName == "frequency") {
            rangeMin = 20;
            rangeMax = 10000;
        }
        
        var newVal = scale_val_to_range(val, 0, 100, rangeMin, rangeMax);
        console.log(rangeMin, rangeMin, newVal);
        var name = this.get_inst_color().name;
        var synthController = name_to_synth_controller(name);
        var effect = synthController.effectsRack[effectId];
        effect[paramName].value = newVal;
    }

    /* Increments the starting note up or down one scale degree */
    increment_start_freq (dir) {
        var freq = this.startFreq;
        var note = Tone.Frequency(freq).toMidi();

        console.log(freq);
        var new_freq;

        if (dir === 1) { //up;
            new_freq = transpose_by_scale_degree(note, 1)
            this.startFreqIndex++;
        }  
        if (dir === 0) { //down
            new_freq = transpose_by_scale_degree(note, -1)
            this.startFreqIndex--;
        }
        this.update_start_freq();
        this.update_note_values();
    }
    
    set_volume (val) {
        this.volume = val;
        this.synth.volume.value = val;
        this.set_stroke_width(vol_to_stroke_width(val));
    }

    set_stroke_width (val) {
        this.path.attr("stroke-width", val);
    }

    /*
        Sets the instColorId. Changes the color and synth to that of the new instColor
    */
    set_inst_color_id (id) {
        console.log("setting to InstColor:", id)
        var instColor = PROJECT.instColors[id];
        
        this.instColorId = id;
        this.set_instrument(instColor.name);
        this.shapeDefaultAttr = {fill: hex_to_Rgba(instColor.color, 0.4), stroke: instColor.color};
        this.animCircleAttr = {fill: instColor.color, stroke: instColor.color};

        this.path.attr(this.shapeDefaultAttr); 
        this.nodes.forEach(function (node) {
            node.set_color(instColor.color)
        })
        this.animCircle.attr(this.animCircleAttr);
    }

    set_instrument (name) {
        console.log("setting instrument to:", name);
        this.panner.disconnect();
        if (this.synth) {
            this.synth.triggerRelease();
            this.synth.disconnect();
            this.synth.dispose();
        }
        // get new base synth
        this.synth = synth_chooser(this, name);

        //connect to its effects
        this.panner.send(name+"effects", 0);
        this.synth.connect(this.panner);

        // init effect values
        this.init_effect_vals(name);

        // refresh popup data
        this.refresh_shape_attr_popup();
    }
    
    /*
        Multiplies the current perimeter by the given factor.
    */
    set_quantize_length (factor) {
        var newPerim = factor * this.getPerim();
        console.log("NEW PERIM:", newPerim);
        if (PROJECT.isAutoQuantized) {
            this.quantizeFactor *= factor;
            newPerim = PROJECT.quantizeLength * this.quantizeFactor;
        }
        this.set_perim_length(newPerim);
    }

    /* 
        Sets the shape's perimeter length (and therefore melody length)
    */
    set_perim_length (len) {
        var currLen = this.path.getTotalLength();
        //var targetSize = Math.round(currLen / len) * len;
        var ratio = len / currLen;
        var transform = this.path.matrix.split();
        //console.log("transform:", transform);

        var newPath = (Raphael.transformPath(this.path.attr("path"), "s"+ratio+","+ratio));
        var pathNoCurves = [];
        for (var i = 0; i < newPath.length - 1; i++) {
            if (newPath[i][0] == "C"){
                var x = newPath[i][3];
                var y = newPath[i][4];
                var lineTo = ["L", x, y];
                pathNoCurves.push(lineTo);
                this.nodes[i].handle.attr("cx", x);
                this.nodes[i].handle.attr("cy", y);

            } else {
                var x = newPath[i][1];
                var y = newPath[i][2];
                this.nodes[i].handle.attr("cx", x);
                this.nodes[i].handle.attr("cy", y);
                pathNoCurves.push(newPath[i]);
            }
        }
        pathNoCurves.push(["Z"])
        this.path.attr("path", pathNoCurves);
        
        console.log("current perim:", currLen, "setting to:", len, "ratio:", ratio);
        console.log("new perim:", this.path.getTotalLength());

        this.update_note_values();
    }

    set_pan (val) {
        this.panner.pan.value = val * 0.7;
    }

    /* --- Updaters --- */

    /* updates the starting note based on the shapes startFreqIndex*/
    update_start_freq () {
        var rootFreq = Tone.Frequency(PROJECT.rootNote).toMidi();
        var newStartFreq = transpose_by_scale_degree(rootFreq, this.startFreqIndex);

        this.startFreq = newStartFreq;
        this.refresh_shape_attr_popup();
    }

    /* (re)sets the note values of all note-edges in the shape */
    update_note_values () {
        console.log("SETTING NOTE VALUES");
        this.part.removeAll();
        var delay = 0;
        
        // add first note
        var firstNoteInfo = this.get_note_info(this.nodes[1], this.nodes[0], 0);
        this.part.add(delay, firstNoteInfo);
    
        delay += firstNoteInfo.noteDur;

        // assign notes up until the end
        for (var i = 2; i < this.nodes.length; i++) {
            var curr = this.nodes[i];
            var prev = this.nodes[i - 1];
            var prevPrev = this.nodes[i - 2];
            
            var noteInfo = this.get_note_info(curr, prev, prevPrev);

            this.part.add(delay, noteInfo);
            delay += noteInfo.noteDur;
        }

        // add last note 
        var iLast = this.nodes.length - 1;
        var lastNoteInfo = this.get_note_info(this.nodes[0], this.nodes[iLast], this.nodes[iLast - 1]);
        this.part.add(delay, lastNoteInfo);
        
        // TODO
        if (PROJECT.isAutoQuantized) {
            var totalLength = PROJECT.quantizeLength * this.quantizeFactor * PROJECT.tempo / 1000;
        } else {
            var totalLength = delay + lastNoteInfo.noteDur;
        }
        console.log("TOTAL LENGTH:", totalLength, PROJECT.tempo);
        this.part.loopEnd = totalLength;
    }

    /* --- Getters ---*/
    
    /* Returns the x,y coordinates of the shapes average point */
    get_center () {
        var bBox = this.path.getBBox();
        var xMean = (bBox.x + (bBox.width + bBox.x)) / 2;
        var xMin = 0;
        var xMax = $("#holder").width();
        xMean = (xMean / xMax) * 2 - 1;
        if (xMean > 1) {
            xMean = 1;
        }
        if (xMean < -1) {
            xMean = -1;
        }
        
        var yMean = (bBox.y + (bBox.height + bBox.y)) / 2;
        var yMin = 0;
        var yMax = $("#holder").height();
        yMean = (yMean / yMax) * 2 - 1;
        if (yMean > 1) {
            yMean = 1;
        }
        if (yMean < -1) {
            yMean = -1;
        }

        return {
            x: xMean,
            y: yMean
        }
    }

    /* Returns the x,y coordinate of the shape's first point*/
    get_origin () {
        var ox = this.path.attr("path")[0][1];
        var oy = this.path.attr("path")[0][2];
        return {
            x: ox,
            y: oy
        }
    }

    /* --- Transport --- */

    /* Stops playback by triggering synth release */
    stop () {
        this.synth.triggerRelease();
        //this.synth.volume.value = -Infinity;
        this.animCircle.hide();
    }

    /* --- Shape Attr Popup --- */

    /* returns the HTML element for the shape's interactive popup */
    get_popup_content () {
        //console.log("GETTING shape attr popup content", this.id);
        
        var colorPickerHtml = '';
        for (var i = 0; i < PROJECT.instColors.length; i++) {
            colorPickerHtml += '<div class="palette-color inst-color'+i+'" style="background: '+PROJECT.instColors[i].color+'" data="'+i+'")"></div>';
        }
        
        var popupHtml = '\
            <div class="tooltip-arrow arrow-left"></div>\
            <div class="section">\
                <!--<span class="close-popup">X</span>-->\
                <label>Color:</label>\
                <div class="color-palette dropdown" style="background: '+this.get_inst_color().color+'">\
                        <i class="ion-chevron-down"></i>\
                        <div class="dropdown-content">\
                            <div class="palette-background">'+colorPickerHtml+'</div>\
                        </div>\
                    </div>\
                <!--<span>Shape: '+this.id+'</span>-->\
            </div>\
            <div class="section">\
                <label>Starting Note:</label>\
                <span class="shape-attr-start-freq">\
                    <span class="start-freq-label">'+this.startFreq+'</span>\
                    <button class="arrow arrow-up"><i class="ion-arrow-up-b"></i></button>\
                    <button class="arrow arrow-down"><i class="ion-arrow-down-b"></i></button>\
                </span>\
            </div>\
            <div class="section">\
                Volume:\
                <input type="range" class="signal-meter"\
                       value="'+this.volume+'" min="-18" max="0">\
            </div>\
            <div class="section mute-solo">\
                <div class="button-cont mute-button-cont">\
                    <button class="shape-attr-mute">Mute</button>\
                </div><div class="button-cont solo-button-cont">\
                    <button class="shape-attr-solo">Solo</button>\
                </div>\
            </div>\
            <div class="section">\
                <div class="button-cont">\
                    <button class="shape-attr-set-perim">Quantize</button>\
                </div><div class="button-cont">\
                    <button class="shape-attr-tofront">To Front</button>\
                </div\
            </div>\
            <div class="section">\
                <div class="button-cont">\
                    <button class="btn-half shape-attr-double" title="Double the size">*2</button>\
                    <button class="btn-half shape-attr-half" title="Halve the size">&divide;2</button>\
                </div><div class="button-cont">\
                    <button class="shape-attr-toback">To Back</button>\
                </div>\
            </div>\
            <div class="section">\
                <button class="shape-attr-delete-shape">Delete Shape</button>\
            </div>';

        return popupHtml;
    }

    /* reloads the information displayed on the popup */
    refresh_shape_attr_popup () {
        console.log("REFRESH POPUP");
        this.popup.find(".start-freq-label").html(this.startFreq);
        this.popup.find(".perim-label").html(this.getPerim());
        this.popup.find(".color-palette").css({"background": this.get_inst_color().color});
    }
    
    /* --- Helper ---*/

    /* returns an object containing note information - value, duration, and 
        previous 2 nodes if they exist.
        calculates the node's note value using the angle centered at nodePrev
    */
    get_note_info (node, nodePrev, nodePrevPrev) {
        var noteVal;
        var duration = (line_distance(node, nodePrev) * PROJECT.tempo) / 1000;
        var isFirst = false;
        
        if (!nodePrevPrev) {
            isFirst = true;
            noteVal = this.startFreq;
        } else {
            var currP = node.getCoords();
            var prevP = nodePrev.getCoords();
            var prevPrevP = nodePrevPrev.getCoords();
            var theta = Raphael.angle(currP.x, currP.y, prevPrevP.x, prevPrevP.y, prevP.x, prevP.y);
            noteVal = NOTE_CHOOSER(nodePrev.noteVal, theta);
        }
        //var theta = Raphael.angle(0,0,4,3,4,0);
        //console.log("TEST THETA:", theta);
        node.noteVal = noteVal;
        node.noteDur = duration;
        var result = {
            noteVal: noteVal,
            noteDur: duration,
            nodeTo: node,
            nodeFrom: nodePrev,
            isFirst: isFirst
        }
        return result;
    }
}

/* ========================================================================== */
/* --------------------------- Vertex Handle class -------------------------- */
/* 
    A Node represents a vertex on a shape. They are draggable, and update their
    parent shape's path when dragged. They are only visible in Edit mode.
*/

class Node {
    constructor (x, y, i, shapeId) {
        var parent = this;
        this.id = shapeId;
        var shapeColor = ACTIVE_SHAPE.get_inst_color().color;
        
        // if first node
        if ((i-1) == 0) {
            this.discattr = {fill: shapeColor, stroke: shapeColor, "stroke-width": 1};
            this.isFirst = true;
        } else {
            this.discattr = {fill: "#eee", stroke: shapeColor, "stroke-width": 2};
            this.isFirst = false;
        }
        
        // handle
        this.handle = r.circle(x,y,handleRadius).attr(this.discattr).hide();
        if (this.isFirst) {this.handle.show();}
        
        
        this.handle.update_shape_path = function (x, y) {
            var currShape = PROJECT.shapesList[parent.id];
            var tempPath = currShape.path.attr("path");

            tempPath[i-1][1] += x;
            tempPath[i-1][2] += y;

            currShape.path.attr("path", tempPath);
        }

        /* ------- Drag ------- */
        this.move = function (dx, dy) {
            if (CURR_TOOL == "adjust") {
                //PROJECT.shapesList[parent.id].animCircle.hide();
                console.log("NODE MOVE");
                dx = snap_to_grid(dx);
                dy = snap_to_grid(dy);

                var cx = this.attr("cx");
                var cy = this.attr("cy");
                
                var newx = cx + dx - (this.odx || 0);
                var newy = cy + dy - (this.ody || 0);
                
                this.attr("cx", newx);
                this.attr("cy", newy);

                this.update_shape_path(dx - (this.odx || 0), dy - (this.ody || 0));
                
                this.odx = dx;
                this.ody = dy;
                var parentShape = PROJECT.shapesList[shapeId];
                // TODO ?
                if (PROJECT.isAutoQuantized) {
                    parentShape.set_perim_length(PROJECT.quantizeLength * parentShape.quantizeFactor);
                } else {
                    parentShape.update_note_values();
                }
            }
        }

        this.up = function () {
            if (CURR_TOOL == "adjust") {
                this.odx = this.ody = 0;
            }
        }

        /* ------- Hover ------- */
        this.hoverIn = function (item) {
            return function (event) {
                if (CURR_TOOL == "adjust") {
                    item.attr(handleHoverInAttr);
                }
            };
        };

        this.hoverOut = function (item) {
            return function (event) {
                if (CURR_TOOL == "adjust") {
                    item.attr(handlesDefaultAttr);
                };
            };
        };

        /* ------- Show/Hide ------- */
        this.hide = function () {
            this.handle.hide();
        }

        this.show = function () {
            this.handle.show();
        }
        
        /* ------- Get cooridinates ------- */
        this.getCoords = function () {
            var transform = this.handle.matrix.split();
            return {
                x: this.handle.attr("cx") + transform.dx,
                y: this.handle.attr("cy") + transform.dy
            }
        }

        this.set_color = function (color) {
            if (this.isFirst) {
                this.handle.attr({fill: color, stroke: color})
            } else {
                this.handle.attr({stroke: color})
            }
        }

        this.handle.drag(this.move, this.up);
        this.handle.hover(this.hoverIn(this.handle), this.hoverOut(this.handle));
    }
}

/* ========================================================================== */
/* ------------------------- Instrument-Color class ------------------------- */
/* 
    An instrument-color is a pairing of a unique color with an instrument. 
    Each InstColor has a section at the bottom of the screen where it can 
    be controlled. When a shape changes color it is given the synth that that
    color is currently paired with. 

    Each synth has four parameters that can be controlled by knobs. The
    the constructor creates the knobs and sets them to their values. 
*/
class InstColor {
    constructor (i, instName, color) {
        var parent = this;
        this.id = i;
        this.name = instName;
        this.color = color;
        this.parentController = name_to_synth_controller(this.name);
        this.li = $("<li>", {"id": "inst-"+this.id, "class": "inst-option", "data": this.name}).html(this.get_li_content());
        
        this.init_li();
    }
    init_li () {
        var parent = this;
        
        // edit knob appearance
        var knobSvg = this.li.find(".knobjs-arcbg");
        if (knobSvg) {
            var knobPath = $(knobSvg).attr("d").split("L1");
            var newPath = knobPath[0];
            $(knobSvg).attr("d", newPath);
        }
        
        // styles
        this.li.css({"background-color": hex_to_Rgba(this.color, 0.9), "border-color": this.color});
        this.li.find(".inst-select").val(this.name);
        this.li.find(".inst-title").css({"background-color": this.color, "color": "#fff"});
        
        $(".inst-selectors ul.inst-list").append(this.li);
        
        // knob defaults
        this.reset_knob_vals(this.parentController);
        
        // handlers
        this.li.find(".inst-title").on("dblclick", function () {
            toggle_expand_inst_selectors();
        })
        
        //this.knobchange = false;
        
        // change synth
        this.li.find(".inst-select").on("change", function () {
            //parent.knobchange = true;
            //console.log("SYNTH NAME CHANGE ============");
            
            parent.set_synth($(this).val());
            
            //console.log("SYNTH NAME CHANGE END ==============");
            //parent.knobchange = false;
        })

        // change param value - knob
        this.li.find(".knob").on("change", function (e) {
            //console.log(e);
            //if (e.originalEvent) {
                //console.log("KNOB CHANGE", parent.name);
                var val = ~~this.value;
                var paramId = $(this).attr("data-target");
                set_param_val(parent.id, paramId, val);
                //console.log("KNOB CHANGE DONE");
            //}
        })

    }
    get_li_content () {
        var dynamicParams = this.parentController.dynamicParamObjs
        
        // synth select list
        var selectHtml = '';
        for (var i = 0; i < PROJECT.synthControllersList.length; i++) {
            selectHtml += '<option>'+PROJECT.synthControllersList[i].name+'</option>'
        }

        // knobs
        var knobsHtml = '';
        for (var i = 0; i < dynamicParams.length; i++) {
            knobsHtml += '\
                <li>\
                    <div>\
                        <x-knobjs-knob id="knob-param-'+i+'" class="knob" data-target="'+i+'"" throw="150"></x-knobjs-knob>\
                    </div>\
                    <div>\
                        <span class="inst-param-title inst-param-title-'+i+'">'+dynamicParams[i].name+'</span>\
                    </div>\
                </li>';
        }
        
        
        var instOptionHtml = '\
            <div class="inst-title">\
                <select class="inst-select" title="Select an instrument">'+selectHtml+'</select>\
                <button class="show-hide show-hide-inst" data-target="inst-selectors" onclick="toggle_expand_inst_selectors()" title="Show/Hide synth controls">\
                    <i class="ion-arrow-left-b"></i>\
                </button>\
                <!--<button class="mute-solo-channel" title="Solo all">S</button>-->\
                <!--<button class="mute-solo-channel" title="Mute all">M</button>-->\
            </div>\
            <ul class="inst-params">'+knobsHtml+'</ul>';

        return instOptionHtml;
    }
   
    set_synth (name) {
        var parent = this;
        this.name = name;

        this.parentController = name_to_synth_controller(this.name);

        PROJECT.shapesList.forEach(function (shape) {
            if (shape.isIncluded && shape.get_inst_color().id == parent.id) {
                shape.set_instrument(parent.name);
            }
        });
        
        this.reset_knob_vals(this.parentController);
    }

    reset_knob_vals (synthController) {
        var parent = this;
        var paramObjs = synthController.dynamicParamObjs;
        
        for (var i = 0; i < paramObjs.length; i++) {
            
            this.li.find(".inst-param-title-"+i).text(paramObjs[i].name);
            var knob = this.li.find("#knob-param-"+i)[0];
            
            var defaultVal = paramObjs[i].default;
            console.log("setting knob defaults");
            knob.setAttribute("value", defaultVal);
        }
    }

    get_knob_val (paramIndex) {
        var knob =  this.li.find("#knob-param-"+paramIndex)[0];
        return ~~knob.value;
    }
}

/* ========================================================================== */
/* ------------------------- Synth Controller class ------------------------- */
/*
    A synth controllers is a wrapper around a Tone.synth. It contains the synth
    and its effects as return effects. get_new_instance generates a new instance
    of the controllers synth, which will send effects to the effects rack. 
    The effectSends array controls the efects for all synths of this type.
*/

class SynthController {
    constructor (name, baseType, baseParams, dynamicParamObjs, fxParams) {
        var parent = this;
        this.name = name;
        this.baseType = baseType;
        this.baseParams = baseParams;
        this.dynamicParamObjs = dynamicParamObjs;
        this.effectsRack = [];

        if (fxParams) {
            for (var i = 0; i < fxParams.length; i++) {
                var fxParam = fxParams[i];
                var effectGain = new Tone.Gain(1);
                var newEffect = new fxParam.type(fxParam.params).connect(effectGain);
                parent.effectsRack.push(newEffect);
            }
        }

        this.fxBus = new Tone.Gain(0.9);
        if (this.effectsRack.length == 2) {
            this.fxBus.chain(this.effectsRack[0], this.effectsRack[1], Tone.Master);
        } else if (this.effectsRack.length == 1) {
            this.fxBus.chain(this.effectsRack[0], Tone.Master);
        } else {
            this.fxBus.chain(Tone.Master);
        }

        //chain: shapefx->send->receive->[fx1(d/w)->fx2]-> master
        this.fxBus.receive(this.name+"effects");
        // create Tone effects
    }
    get_new_instance (parentShape) {
        console.log("making new instance for shape:", parentShape.id);
        var synth = new this.baseType(this.baseParams);
/*        if (this.effectsRack.length == 2) {
            synth.chain(this.effectsRack[0], this.effectsRack[1], parentShape.panner);
        } else if (this.effectsRack.length == 1) {
            synth.chain(this.effectsRack[0], parentShape.panner);
        } else {
            synth.chain(parentShape.panner, Tone.Master);
        }*/
        return synth;
    }
}

function name_to_synth_controller (name) {
    var index = synthNameEnum[name];
    return PROJECT.synthControllersList[index];
}


function set_param_val(instColorId, paramIndex, rawVal) {
    console.log("setting param val:", instColorId, paramIndex, rawVal);
    var synthName = PROJECT.instColors[instColorId].name;
    var synthController = name_to_synth_controller(synthName);

    PROJECT.shapesList.forEach(function (shape) {
        if (shape.instColorId == instColorId) {
            synthController.dynamicParamObjs[paramIndex].func(shape, rawVal);
        }
    })
}

/* ========================================================================== */
/* ========================================================================== */
/* ----------------------------- DOCUMENT READY ----------------------------- */
/* ========================================================================== */
/* ========================================================================== */

var PROJECT = new Project;
var ACTIVE_SHAPE;

$(document).ready(function () {
    PROJECT.init();
    //makeWaveVis();

    //console.log("PROJECT:", PROJECT.name);
    //console.log("synthControllersList:", PROJECT.synthControllersList);
    //console.log("instColors:", PROJECT.instColors);

    init_grid();
    //hide_handles();
    set_draw_inst_color(0);

    hide_menu();
    expand_inst_selectors();
    
    //console.log(PROJECT.synthControllersList);

    alert(alertMessage);

/*    window.setInterval(function(){
        if (masterMeter.value > 0.1) {
            console.log("METER", masterMeter.value);
        }
    }, 100);*/
    
    //generate_random_shapes(1);
});

/* ========================================================================== */
/* ========================================================================== */
/* -------------------------------- HANDLERS -------------------------------- */
/* ========================================================================== */
/* ========================================================================== */
    
/* ---------- Keyboard shortcuts ---------- */
window.onkeydown = function (e) {
    console.log(e.which);
    // TAB
    if (e.which === 9) {
        console.log("tab");
        if (CURR_TOOL === "draw") {
            select_tool("adjust");
        } else if (CURR_TOOL === "adjust") {
            select_tool("draw");
        }
        e.preventDefault();
    }
    // SPACE
    if (e.which === 32) { 
        if (e.stopPropagation) {
            e.stopPropagation();
            e.preventDefault();
        }
        toggle_play_stop();
    }
    // DELETE 
    if (e.which === 8) {
        if (SELECTED_SHAPE_ID >= 0) {
            PROJECT.shapesList[SELECTED_SHAPE_ID].delete();
            SELECTED_SHAPE_ID = -1;
        }
    }
};

/* ---------- Right Click ---------- */
$("#holder").on('contextmenu', function(ev) {
    ev.preventDefault();
    console.log("right click");
    //alert('success!');
    return false;
}, false);

/* ---------- Toggle play / stop ---------- */
$(".play-stop-toggle").click(function () {
    toggle_play_stop();
});

/* ---------- Toggle record ---------- */
$(".record-toggle").click(function () {
    if (PLAYING && !RECORDING) {
        record_start();
    } else if (PLAYING && RECORDING){
        record_stop();
    } else{ 
        if (RECORD_ARMED) {
            disarm_record();
        }
        else {
            arm_record();
        }
    }
});

/* ---------- Change tempo ---------- */
$(".tempo-slider").on("mouseup", function () {
    PROJECT.set_tempo(this.value * -1);
})

/* ---------- Change scale ---------- */
$(document).on('change','.scale-select',function () {
    PROJECT.set_scale(this.value);
});

/* ---------- Change key ---------- */
$(document).on('change','.tonic-select',function () {
    PROJECT.set_tonic(this.value);
});

/* ---------- Stop click propegation when clicking in shape popup ---------- */
$(".shape-attr-popup").on( "mousedown", function (event) {
    event.stopPropagation();
});

/* ---------- Clear canvas ---------- */
$(".clear").click(function () {
    PROJECT.clear_canvas();
});

/* ---------- Change tool ---------- */
$("#draw-tool").click(function () {
    select_tool("draw");
});

$("#adjust-tool").click(function () {
    select_tool("adjust");
});

/* ---------- Toggle grid ---------- */
$("#grid").click(function () {
    if ($("#grid").is(":checked")) {
        show_grid();
    } 
    else {
        hide_grid();
    }
});

/* ---------- Toggle quantization ---------- */
$("#auto-quantize").click(function () {
    if ($("#auto-quantize").is(":checked")) {
        PROJECT.isAutoQuantized = true;
        PROJECT.shapesList.forEach(function (shape) {
            if (shape.isIncluded) {
                shape.set_perim_length(PROJECT.quantizeLength * shape.quantizeFactor);
            }
        });
    } 
    else {
        PROJECT.isAutoQuantized = false;
    }
});

/* ========================================================================== */
/* --------------------------- HOLDER MOUSEMOVE ----------------------------- */
/* ========================================================================== */
$("#holder").on("mousemove", function (e) {
    var x = e.pageX - GLOBAL_MARGIN;
    var y = e.pageY - GLOBAL_MARGIN;
    
    x = snap_to_grid(x);
    y = snap_to_grid(y);

    if (CURR_DRAW_STATE == "drawing") {
        var origin_x = ACTIVE_SHAPE.get_origin().x;
        var origin_y = ACTIVE_SHAPE.get_origin().y;

        // snap to origin
        if (ACTIVE_SHAPE.length() > 1 && x < (origin_x + ORIGIN_RADIUS) 
                && x > (origin_x - ORIGIN_RADIUS) && y < (origin_y + ORIGIN_RADIUS) 
                && y > (origin_y - ORIGIN_RADIUS)) {
            x = origin_x;
            y = origin_y;
            ACTIVE_SHAPE.path.attr({"fill-opacity": previewShapeOpacity});
        }
        else {
            ACTIVE_SHAPE.path.attr("fill-opacity", 0);
        }
    }

    var endpoint = "L" + x + "," + y;
    hoverCircle.attr({cx: x, cy: y});

    if (hoverLine.attr("path")) {
        hoverLine.attr("path", subpath_to_string(hoverLine, 0) + endpoint);
    }
});

/* ========================================================================== */
/* --------------------------- HOLDER MOUSEDOWN ----------------------------- */
/* ========================================================================== */
$("#holder").on( "mousedown", function (e) {
    console.log(e.which); // 1 == left click, 3 == right click
    if ($(".shape-attr-popup").is(":visible")) {
        hide_details();
    }
    if (e.which === 1) {
        
        if (CURR_TOOL == "draw") {
            
            if (CURR_DRAW_STATE == "ready") {
                console.log("creating new shape with instcolor", SELECTED_INSTCOLOR_ID);
                ACTIVE_SHAPE = new Shape(PROJECT.shapesList.length, SELECTED_INSTCOLOR_ID);
            }

            var x = e.pageX - GLOBAL_MARGIN;
            var y = e.pageY - GLOBAL_MARGIN;
            
            x = snap_to_grid(x);
            y = snap_to_grid(y);

            var prev_n = [];
            
            //console.log("active shape length:", ACTIVE_SHAPE.length());

            /* Update previous node if the path already exists */
            if (ACTIVE_SHAPE.length()) {
                var origin_x = ACTIVE_SHAPE.get_origin().x;
                var origin_y = ACTIVE_SHAPE.get_origin().y;
                prev_n = ACTIVE_SHAPE.path.attr("path")[ACTIVE_SHAPE.length() - 1];
            }
            /* Snaps to origin => complete shape if within the radius */
            if (ACTIVE_SHAPE.length() > 1 && x < (origin_x + ORIGIN_RADIUS) && 
                    x > (origin_x - ORIGIN_RADIUS) && y < (origin_y + ORIGIN_RADIUS) && 
                    y > (origin_y - ORIGIN_RADIUS)) {
                set_draw_state("ready");
                ACTIVE_SHAPE.complete();
                PROJECT.shapesList.push(ACTIVE_SHAPE);
                ACTIVE_SHAPE = null;

                hoverLine.attr("path", "");
            }
            /* If not, add to current path */ 
            else if ((x != prev_n[1] || y != prev_n[2])){    
                var moveTo = "M" + x + "," + y;
                var lineTo = "L" + x + "," + y;

                hoverLine.attr("path", moveTo);                

                /* shape is empty */
                if (ACTIVE_SHAPE.path.attr("path") === "") {
                    set_draw_state("drawing");
                    ACTIVE_SHAPE.path.attr("path", moveTo);
                } else {
                    ACTIVE_SHAPE.path.attr("path", path_to_string(ACTIVE_SHAPE.path) + lineTo);
                }
                var newNode = new Node(x, y, ACTIVE_SHAPE.length(), PROJECT.shapesList.length);
                ACTIVE_SHAPE.nodes.push(newNode);
            }
        }
    }
    if (e.which === 3) {
        if (ACTIVE_SHAPE) {
            hoverLine.attr("path", "");
            set_draw_state("ready");
            ACTIVE_SHAPE.delete();
            ACTIVE_SHAPE = null;
        }
    }
});



/* ========================================================================== */
/* ========================================================================== */
/* -------------------------------- FUNCTIONS ------------------------------- */
/* ========================================================================== */
/* ========================================================================== */


/* ========================================================================== */
/* ------------------------------- TRANSPORT -------------------------------- */
/* ========================================================================== */

/* -------- Play / Stop --------- */

function toggle_play_stop () {
    console.log(PLAYING);
    if (PLAYING) { // we stop
        stop_handler();

    } else { // we play
        play_handler();
    }
}

function play_handler () {
    console.log(CURR_DRAW_STATE);
    if (CURR_DRAW_STATE === "ready") {
        if (RECORD_ARMED) {
            record_start();
        }
        $(".play-stop-toggle").html("<i class='ion-stop'></i>");
        PLAYING = true;
        //Tone.Master.mute = false;
        Tone.Transport.start("+0.1");
    }
}

function stop_handler () {
    $(".play-stop-toggle").html("<i class='ion-play'></i>");
    PLAYING = false;
    PROJECT.shapesList.forEach(function (shape) {
        if (shape.isIncluded) {
            shape.stop();
        }                
    });
    Tone.Transport.stop(0);
    //Tone.Master.mute = true;
    if (RECORDING) {
        record_stop();
    }
}

/* -------- Record --------- */

function record_start () {
    $(".record-toggle").css({"color": "#F00"})
    console.log("RECORDING");
    $(".recorder-blink").show();
    RECORDING = true;
    rec.record();
}

function record_stop () {
    console.log("STOP RECORDING");
    $(".recorder-blink").hide();
    $(".record-toggle").css({"color": "#777"})
    rec.stop();
    rec.exportWAV(function (blob) {
        var url = URL.createObjectURL(blob);
        var li = document.createElement('li');
        var au = document.createElement('audio');
        var hf = document.createElement('a');

        au.controls = true;
        au.src = url;
        hf.href = url;
        hf.download = PROJECT.name /*+ new Date().toISOString()*/ + '.wav';
        
        //hf.download = "<i class='ion-arrow-down-a'></i> " + PROJECT.name + '.wav';
        hf.innerHTML = "<i class='ion-arrow-down-a'></i> " + PROJECT.name + '.wav';
        
        var time = new Date();
        var year = time.getFullYear();
        var month = time.getMonth()+1;
        var date1 = time.getDate();
        var hour = time.getHours();
        var minutes = time.getMinutes();
        var seconds = time.getSeconds();

        $(li).append("<p>"+month+"/"+date1+" at "+hour+":"+minutes+"</p>");
        $(li).append(au);
        $(li).append(hf);
        
        $(".downloads .downloads-list").prepend(li);
        $(".downloads").show();
    });
    RECORDING = false;
    rec.clear();
    disarm_record();
}

function arm_record () {
    $(".record-toggle").css({"color": "#F00"})
    RECORD_ARMED = true;
    console.log("record armed");
}

function disarm_record () {
    $(".record-toggle").css({"color": "#444"})
    RECORD_ARMED = false;
    console.log("record DISarmed");
}


/* ========================================================================== */
/* --------------------------------- CANVAS --------------------------------- */
/* ========================================================================== */

/* Initializes the grid: The grid is an array of dots 
*/
function init_grid () {
    var canvas_width = $("#holder").width();
    var canvas_height = $("#holder").height();

    for (var x = GRID_SIZE; x < canvas_width; x += GRID_SIZE) {
        for (var y = GRID_SIZE; y < canvas_height; y += GRID_SIZE) {
            var gridDot = r.circle(x ,y, 2).toBack();
            gridDot.attr(gridDotAttr);
            gridDots.push(gridDot);
            hide_grid();
        }
    }

    if ($("#grid").is(":checked")) {show_grid();} 
    else {hide_grid();}
}

function hide_grid () {
    gridDots.hide();
}

function show_grid () {
    gridDots.show();
}

/* Given a x or y coordinate, returns that number rounded to the grid size */
function snap_to_grid (p) {
    if ($("#snap").is(":checked")) {
        return (Math.round(p / GRID_SIZE) * GRID_SIZE);
    };
    return p;
}

/* -------- HANDLES -------- */
function hide_handles () {
    PROJECT.shapesList.forEach(function (shape) {
        if (shape.isIncluded) {
            shape.hide_handles();
        }
    });
}

function show_handles () {
    PROJECT.shapesList.forEach(function (shape) {
        if (shape.isIncluded) {
            shape.show_handles();
        }
    });
}

function hide_details () {
    SELECTED_SHAPE_ID = -1;
    PROJECT.shapesList.forEach(function (shape) {
        if (shape.isIncluded) {
            shape.path.attr({"fill-opacity": completedShapeOpacity});
        }
    });
    $(".shape-attr-popup").hide();
}

/* -------- TOOLS -------- */
function select_tool (tool) {
    if (CURR_DRAW_STATE == "ready") {
        if (tool === "draw") {
            hoverCircle.show();
            hide_handles();
        } else if (tool === "adjust"){
            hoverCircle.hide();
            show_handles();
        } 

        CURR_TOOL = tool;
        hide_details();
        $( ".tool" ).removeClass("active");
        
        var toolName = "#" + tool + "-tool";
        $( toolName ).addClass("active");
    }
}

function set_draw_state (state) {
    if (state === "ready") {
        //$(".menu a").prop('disabled', false);
        $(".controls button").prop('disabled', false);
        $(".controls input").prop('disabled', false);
        $(".controls select").prop('disabled', false);
    } else if (state === "drawing") {
        //$(".menu a").prop('disabled', true);
        $(".controls button").prop('disabled', true);
        $(".controls input").prop('disabled', true);
        $(".controls select").prop('disabled', true);
    }
    CURR_DRAW_STATE = state;
}

function populate_list (values, selectedItem, className) {
    //$(className).html("yo");
    //console.log("POPULATE LIST:",values,"SELECTED ITEM", selectedItem);
    var optionsHtml = '';
    var selectedHtml = '';
    for (var i = 0; i < values.length; i++) {
        //console.log(values[i]);
        if (values[i].replace(/ /g,'') == selectedItem || values[i] == selectedItem) {
            selectedHtml = "selected";
        }
        optionsHtml +=  '<option value="' + values[i].replace(/ /g,'') + '" '+selectedHtml+'>' + values[i] + '</option>'; 
        selectedHtml = '';
    }
    $(className).html(optionsHtml);
}

/* -------- Instrument Colors -------- */
function set_draw_inst_color (id) {
    SELECTED_INSTCOLOR_ID = id;
    var instColor = PROJECT.instColors[id];

    $(".controls-section .color-palette").css({background: instColor.color})
    var synthName = instColor.li.find(".inst-select").attr("data");
    
    hoverLine.attr({stroke: instColor.color});
    hoverCircle.attr({fill: instColor.color, stroke: instColor.color});
    
    if (CURR_DRAW_STATE === "drawing") {
        ACTIVE_SHAPE.set_inst_color_id(instColor.id);
    }
}


/* ========================================================================== */
/* ------------------------------ NOTE CHOOSING ----------------------------- */
/* ========================================================================== */

function index_of_note (letter, scale) {
    //console.log("looking for", letter, "in", scale);
    for (var i = scale.length - 1; i >= 0; i--) {
        if (teoria.note(scale[i]).chroma() === teoria.note(letter).chroma()) {
            //console.log("FOUND:", letter, " at index:", i);
            return i;
        } 
    }
}

function transpose_by_scale_degree (note, deg) {
    
    //console.log("=========== CHANGE DEGREE ===========");
    
    var noteVal = Tone.Frequency(note, "midi").toNote();
    var noteObj = teoria.note.fromMIDI(note);

    var noteLetter = noteVal.slice(0, -1).toLowerCase();
    var noteOctave = parseInt(noteVal.slice(-1));
    
    var scaleSimple = PROJECT.scaleObj.simple();
    var length = scaleSimple.length;

    var addOctaves = parseInt(deg / length);
    //console.log("ADD OCTAVES", addOctaves)
    var noteIndex = index_of_note(noteLetter, scaleSimple);
    //console.log("note index", noteIndex);
    var newNoteIndex = noteIndex + (deg % length);
    //console.log("new note index", newNoteIndex);
    
    // going up
    if (newNoteIndex >= length) {
        newNoteIndex = newNoteIndex - length;
    }
    // going down
    else if (newNoteIndex < 0) {
        newNoteIndex += length;
    }

    var newNoteLetter = scaleSimple[newNoteIndex];
    var newOctave = noteOctave;
    
    var newNoteObj = teoria.note(scaleSimple[newNoteIndex] + noteOctave);

    if (deg > 0 && newNoteObj.midi() < noteObj.midi()) {
        newOctave++;
    }
    if (deg < 0 && newNoteObj.midi() > noteObj.midi() && noteOctave > 0) {
        newOctave--;
    }
    
    newOctave += addOctaves;
    var newNoteString = scaleSimple[newNoteIndex] + newOctave.toString();
    //console.log("new note string", newNoteString);
    newNoteObj = teoria.note(newNoteString);

    var newNote = newNoteObj.toString();
    //console.log("NEW NOTE:", newNote);
    return newNote;
}

function note_chooser1 (freq, theta) {
    //console.log("================ NOTE CHOOSER ================")

    var note = Tone.Frequency(freq).toMidi();

    // adjust angle
    if (theta < 0) {
        theta = theta + 360;
    }

    if (theta > 180) {
        theta = theta - 360;
    }
    var neg_mult = 1;
    if (theta < 0) {
        neg_mult = -1;
    }
    var absTheta = Math.abs(theta);

    // find sector
    var notesInScale = PROJECT.scaleObj.simple().length - 1;
    var changeInScaleDegree = 0;
    var dTheta = 180 / notesInScale;
    var lowerBound = 0;
    var upperBound = dTheta;

    for (var i = notesInScale; i > 0; i--) {
        if(is_between(absTheta, lowerBound, upperBound)) {
            /*console.log("THETA:", absTheta);
            console.log("IN THIS SECTOR:", i);
            console.log("IS NEGATIVE:", neg_mult);*/
            var newNote = transpose_by_scale_degree(note, i*neg_mult);
            break;
        }
        lowerBound = upperBound;
        upperBound += dTheta;
    }
    return newNote;
}

/* ========================================================================== */
/* ----------------------------- SYNTH CHOOSING ----------------------------- */
/* ========================================================================== */

function synth_chooser (parentShape, newSynthName) {
    var index = synthNameEnum[newSynthName];
    var synth = PROJECT.synthControllersList[index].get_new_instance(parentShape);
    return synth;
}



/* ========================================================================== */
/* -------------------------------- HELPER  --------------------------------- */
/* ========================================================================== */

function line_distance (point1, point2) {
    var xs = 0;
    var ys = 0;
    var p1 = point1.getCoords();
    var p2 = point2.getCoords();
    
    xs = p2.x - p1.x;
    xs = xs * xs;
    ys = p2.y - p1.y;
    ys = ys * ys;
    
    return Math.sqrt( xs + ys );
}

function is_between (val, a, b) {
    return (val >= a && val <= b);
}

function path_to_string (path) {
    return path.attr("path").join()
}

function subpath_to_string (path, i) {
    return path.attr("path")[i].join()
}

function vol_to_stroke_width (vol) {
    vol = parseInt(vol);
    if (vol < -10) {
        return 1;
    } else if (vol < -5) {
        return 2;
    } else {
        return 3;
    }
}

function hex_to_Rgba (hex, a) {
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+a+')';
    }
    throw new Error('Bad Hex');
}

function y_coord_to_index (pos) {
    if (pos > .8) {
        return -4;
    } else if (pos > .6) {
        return -3;
    } else if (pos > .4) {
        return -2;
    } else if (pos > .2) {
        return -1;
    } else if (pos > 0) {
        return 0;
    } else if (pos > -.2) {
        return 1;
    } else if (pos > -.4) {
        return 2;
    } else if (pos > -.6) {
        return 3;
    } else if (pos > -.8) {
        return 4;
    } else if (pos > -1) {
        return 5;
    } else return 6;
}

function scale_val_to_range (oldVal, oldMin, oldMax, newMin, newMax) {
    return (((oldVal - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin;
}

/* ------------------ Random shapes */

function generate_random_coords (length) {
    var xs = [];
    var ys = [];
    var randCoords = [];
    
    var canvasWidth = $("#holder").width() - 10;
    var canvasHeight = $("#holder").height() - 80;

    for (var i=0, t=canvasWidth; i < length; i++) {
        xs.push(Math.round(Math.random() * t))
    }

    for (var i=0, t=canvasHeight; i < length; i++) {
        ys.push(Math.round(Math.random() * t) + 70)
    }

    for (var i = 0; i < length; i++) {
        randCoords.push({x: xs[i], y: ys[i]});
    }
    console.log("RAND COORDS:", randCoords)
    return randCoords;
}

function generate_random_shapes (numShapes, length) {
    //console.log("RAND COORDS", randCoords);
    var randShapes = [];
    for (var i = 0; i < numShapes; i++) {
        var shapeData = {
            pathList: generate_random_coords(length),
            startFreqIndex: 0,
            volume: -2,
            isMuted: false,
            instColorId: 0
        }
        randShapes.push(shapeData);
    }
    var projObj = {
        tempo: PROJECT.tempo,
        tonic: PROJECT.scaleObj.tonic.toString(),
        scaleName: PROJECT.scaleObj.name,
        shapesList: randShapes,
        instColorNames: ["Keys", "Keys", "Keys", "Keys", "Keys"]
    }

    PROJECT.load(projObj);
}

/* ========================================================================== */
/* ---------------------------------- Menu ---------------------------------- */
/* ========================================================================== */

$(".modal-background").on("click", function () {
    $(".modal-background").hide();
});

$('.modal').click(function (e) {
  e.stopPropagation();
});

$(".show-modal").on("click", function () {
    $(".modal-background").hide();
    var target = "." + $(this).attr("data") + "-modal";
    $(target).show();
});

$(".close-modal").on("click", function () {
    var target = "." + $(this).attr("data") + "-modal";
    $(".modal-background").hide();
});

$(".show-hide").on("click", function () {
    var target = $(this).attr("data-target");
    if (target === "menu") {
        if ($(".top-bar").css("top") == "0px") {
            hide_menu();
        } else {
            show_menu();
        }
    }
    if (target === "inst-selectors") {
        toggle_expand_inst_selectors();
    }
});

function show_menu () {
    $(".top-bar").animate({"top":'0px'}, 200);
    $(".show-hide-menu").html('<i class="ion-chevron-up"></i>');
}

function hide_menu () {
    $(".top-bar").animate({"top":"-20px"}, 200);
    $(".show-hide-menu").html('<i class="ion-chevron-down"></i>');
}

function toggle_expand_inst_selectors () {
    if ($(".inst-selectors").css("height") == "20px") {
        expand_inst_selectors()
    } else {
        reduce_inst_selectors()
    }
}

function expand_inst_selectors () {
    $(".inst-selectors").animate({"height":'92px'}, 200);
    $(".show-hide-inst").html('<i class="ion-arrow-down-b"></i>');
}

function reduce_inst_selectors () {
    $(".inst-selectors").animate({"height":'20px'}, 200);
    $(".show-hide-inst").html('<i class="ion-arrow-left-b"></i>');
}
/* =========== */

/*$(".show-hide-info-pane").on("click", function(){
    //console.log($(".menu").css("top"));
    if ($(".info-pane").css("bottom") == "0px") {
        hide_info_pane()
    } else {
        show_info_pane()
    }
});

function show_info_pane() {
    $(".info-pane").animate({"bottom":0}, 200);
    $(".show-hide-info-pane").html('<i class="ion-chevron-down"></i>');
}

function hide_info_pane() {
    $(".info-pane").animate({"bottom":"-100px"}, 200);
    $(".show-hide-info-pane").html('<i class="ion-chevron-up"></i>');
}*/

/* ========================================================================== */
/* ---------------------------------- Info ---------------------------------- */
/* ========================================================================== */

function set_info_text (text) {
    $(".info-pane .info-pane-text").html(text);
}

/* ============================= Fullscreen ================================= */

$(".enter-fullscreen").on("click", function () {
    toggleFullScreen();
});

function toggleFullScreen () {
  if (!document.fullscreenElement &&    // alternative standard method
      !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

document.addEventListener("fullscreenchange", onFullScreenChange, false);
document.addEventListener("webkitfullscreenchange", onFullScreenChange, false);
document.addEventListener("mozfullscreenchange", onFullScreenChange, false);

function onFullScreenChange () {
    var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
    if (fullscreenElement) {
        $(".enter-fullscreen").html('<i class="ion-arrow-shrink"></i>')
    } else  {
        $(".enter-fullscreen").html('<i class="ion-arrow-expand"></i>')
    }
}

var waitForFinalEvent = (function () {
  var timers = {};
  return function (callback, ms, uniqueId) {
    if (!uniqueId) {
      uniqueId = "Don't call this twice without a uniqueId";
    }
    if (timers[uniqueId]) {
      clearTimeout (timers[uniqueId]);
    }
    timers[uniqueId] = setTimeout(callback, ms);
  };
})();

$(window).resize(function () {
    waitForFinalEvent(function(){
        init_grid();
    }, 500, "some unique string");
});


/* ========================================================================== */
/* =============================== Visualizer =============================== */
/* ========================================================================== */

function makeWaveVis() {
    //drawing the FFT
   /* var fftContext = $("<canvas>",{
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
    }*/

    //the waveform data
    var waveContext = $("<canvas>", {
        "id" : "waveform"
    }).appendTo("body").get(0).getContext("2d");
    waveContext.fillStyle="rgba(0, 0, 200, 0.5)";
    var waveformGradient;

    function drawWaveform(values){
        //draw the waveform
        waveContext.clearRect(0, 0, canvasWidth, canvasHeight);
        var values = masterWaveform.analyse();
        waveContext.beginPath();
        waveContext.lineJoin = "round";
        waveContext.lineWidth = 7;
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
        canvasWidth = $("#holder").width();
        canvasHeight = $("#holder").height();
        waveContext.canvas.width = canvasWidth;
        //fftContext.canvas.width = canvasWidth;
        waveContext.canvas.height = canvasHeight;
        //fftContext.canvas.height = canvasHeight;

        //make the gradient
        waveformGradient = waveContext.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        waveformGradient.addColorStop(0, "#fff");
        waveformGradient.addColorStop(1, "#fff");   
    }

    sizeCanvases();
    $(window).resize(sizeCanvases);

    function loop(){
        requestAnimationFrame(loop);
        //get the fft data and draw it
        //var fftValues = fft.analyse();
        //drawFFT(fftValues);
        //get the waveform valeus and draw it
        var waveformValues = masterWaveform.analyse();
        drawWaveform(waveformValues);
    }
    loop();
}


/* ========================================================================== */
/* ================================ Project ================================= */
/* ========================================================================== */
var projectData;
function project_dump () {
    projectData = PROJECT.dump()
}

function project_load () {
    PROJECT.load(projectData);
}
