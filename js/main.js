/* =============================================================================
    
    SHAPE YOUR MUSIC
    
    A web application for composing visually. Shapes are loops, where each side
    is a note. The melodies are determined by the angles between sides.

    Charlie Colony and Elias Jarzombek
    Code written by Elias Jarzombek

    V2: 2017

============================================================================= */

/* --------------------------------- RAPHAEL -------------------------------- */
var r = Raphael("holder", "100%", "100%");
r.customAttributes.progress = function (v) {
    var path = this.data("mypath");

    if (!path) {
        return {
            transform: "t0,0"
        };
    }    
    var len = path.getTotalLength();
    var point = path.getPointAtLength(v * len);
    
    return {
        transform: "t" + [point.x, point.y]
    };
};

/* --------------------------------- COLORS --------------------------------- */
var warningRed  = "rgba(255,100,100,.5)";
var black       = "rgba(30,30,30,1)";
var white       = "rgba(255,255,255, .8)";

/* ------------------------------- ATTRIBUTES ------------------------------- */
/* shapes */
var shapeDefaultAttr        = {stroke: black, opacity: 1};
var shapeHoverAttr          = {"stroke-width": 3};
var shapeFilledPreviewAttr  = {fill: "rgba(120,120,120,.1)"};
var shapeFilledAttr         = {fill: "rgba(100,100,100,.2)"};
var shapeWarningAttr        = {fill: warningRed, stroke: warningRed};
var shapeSelectedAttr       = {fill: "rgba(0,0,0,.5)", stroke: black, "stroke-width": 3};
var shapeMutedAttr          = {opacity: 0.2};

/* animated circle */
var animCircleAttr          = {"fill": "#111", "stroke": "#111", "stroke-width": 2, opacity: 1};
var animCircleBangStartAttr = {"r": 7, "fill": "#fff"};
var animCircleBangEndAttr   = {"r": 3, "fill": "#111"};

/* handles */
var handlesWarningAttr = {"opacity": 0.2};
var handlesDefaultAttr = {"r": 3, "stroke-width": 2};
var handleHoverInAttr = {"r": 6, "stroke-width": 3};

/* hover hint */
var hoverCircleAttr   = {fill: "#AAA", stroke: "#aaa"};
var hoverLineAttr     = {"stroke": "#AAA", "stroke-width": "2"};

/* grid */
var gridDotAttr       = {"fill": "#777", "stroke-width": 1, "stroke": "#FFF"};

/* --------------------------------- GLOBALS -------------------------------- */

// AUDIO ===============
Tone.Transport.latencyHint = 'interactive';
/*  "interactive" (default, prioritizes low latency)
    "playback" (prioritizes sustained playback)
    "balanced" (balances latency and performance)
    "fastest" (lowest latency, might glitch more often)
*/
//var TEMPO = 6;
var DEFAULT_TEMPO = 5;

var PLAYING = false;
var DEFAULT_SYNTH = "Simple";
//var PRESETS = new Presets();

// SCALE ===============
var DEFAULT_KEY = "A3";
var DEFAULT_SCALE = "major";
var NOTE_CHOOSER = note_chooser1;
var keysList = ["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", 
                "locrian", "major pentatonic", "minor pentatonic", "chromatic", 
                "blues", "double harmonic", "flamenco", "harmonic minor", 
                "melodic minor", "wholetone"];
var tonicsList = ["a", "a#", "b", "c", "c#", "d", "d#", "e", "f", "f#", "g", "g#"];
//var tonicsList = teoria.note("a").scale("chromatic").simple();

// GRID ===============
var GRID_SIZE = 50;
var GLOBAL_MARGIN = 5;
var gridDots = r.set();

// TOOLS ===============
// draw, adjust
var CURR_TOOL = "draw";
var CURR_DRAW_STATE = "ready";

// LINE TO MOUSE ===============
var ORIGIN_RADIUS = 15;
var PREV_ENDPOINT;
var hoverLine = r.path().attr(hoverLineAttr);
var hoverCircle = r.circle(0,0,3).attr(hoverCircleAttr);

/*var source = Tone.context;
console.log (source);
var rec = new Recorder(source.destination.context);*/

/* ========================================================================== */
/* ========================================================================== */
/* ========================================================================== */
/* -------------------------------- CLASSES --------------------------------- */
/* ========================================================================== */
/* ========================================================================== */
/* ========================================================================== */


/* ------------------------------ Project class ----------------------------- */
class Project {
    constructor(/*proj_obj*/){
        this.title = "New Project";
        this.tempo = DEFAULT_TEMPO;
        this.scaleObj = teoria.note(DEFAULT_KEY).scale(DEFAULT_SCALE);
        this.rootNote = this.scaleObj.tonic.toString();
        this.shapesList = [];

        /* Init */
        this.init_tempo();
        this.init_scale_select();
        this.init_tonic_select();
    }
    /* ---------- SETTERS ---------- */
    set_tempo (tempo){
        this.tempo = tempo;
        this.reset_all_notes();
    }
    set_scale(name) {
        console.log("SETTING SCALE TO:", name);
        this.scaleObj = teoria.note(this.rootNote).scale(name);
        console.log(this.scaleObj.simple());
        for (var i = this.shapesList.length - 1; i >= 0; i--) {
            console.log(i);
            this.shapesList[i].update_start_freq();
        }
        this.reset_all_notes();
    }
    set_tonic(name) {
        console.log("set tonic:", name);
        var note = teoria.note(name);
        var currScaleName = this.scaleObj.name;
        this.scaleObj = note.scale(currScaleName);
        this.rootNote = note.toString();
        console.log("new scale:", this.scaleObj.simple())
        for (var i = this.shapesList.length - 1; i >= 0; i--) {
            this.shapesList[i].update_start_freq();
        }
        this.reset_all_notes();
    }

    /* ---------- ACTIONS ---------- */

    init_tempo(){
        $(".tempo-slider").val(this.tempo * -1);
    }

    init_scale_select(){
        var keySelectHtml = ""
        for (var i = 0; i < keysList.length; i++) {
            keySelectHtml +=  "<option value='" + keysList[i].replace(/ /g,'') + "'>" + keysList[i] + "</option>" 
        }
        $(".scale-select").html(keySelectHtml);
    }

    init_tonic_select(){
        var tonicSelectHtml = ""
        for (var i = 0; i < tonicsList.length; i++) {
            tonicSelectHtml +=  "<option value='" + tonicsList[i] + "'>" + tonicsList[i] + "</option>" 
        }
        $(".tonic-select").html(tonicSelectHtml);
    }

    clear_canvas(){
        hide_details();
        stop_handler();
        for (var i = this.shapesList.length - 1; i >= 0; i--) {
            unmute_shape(i);
            this.shapesList[i].delete();
        }
        r.clear();
        init_grid();
        
        if ($("#grid").is(":checked")) {show_grid();} 
        else {hide_grid();}
        
        this.shapesList = [];
        ACTIVE_SHAPE = new Shape(/*this.rootNote, */DEFAULT_SYNTH, 0);
        
        hoverLine = r.path().attr(hoverLineAttr);
        hoverCircle = r.circle(0,0,3).attr(hoverCircleAttr);
        if (CURR_TOOL == "adjust") {
            hoverCircle.hide();
        }
        select_tool("draw");
    }

    reset_all_notes() {
        for (var i = this.shapesList.length - 1; i >= 0; i--) {
            this.shapesList[i].set_note_values();
        }
    }

    /* ---------- I/O ---------- */

    dump(){
        var savedShapesList = []; 
        for (var i = 0; i < this.shapesList.length ; i++) {
            var currShape = this.shapesList[i];
            if (currShape.included) {
                var coords = []
                for (var j = 0; j < currShape.nodes.length; j++) {
                    var p = {
                        x: currShape.nodes[j].getX(),
                        y: currShape.nodes[j].getY(),
                    }
                    coords.push(p);
                }
                var shapeData = {
                    pathList: coords,
                    startFreqIndex: currShape.startFreqIndex,
                    volume: currShape.volume,
                    isMuted: currShape.isMuted
                }
                savedShapesList.push(shapeData);
            }
        }
        var proj_obj = {
            tempo: this.tempo,
            tonic: this.scaleObj.tonic.toString(),
            scaleName: this.scaleObj.name,
            shapesList: savedShapesList
        }
        return proj_obj;
    }

    load(proj_obj){
        console.log("LOADING:", proj_obj);
        // TODO confirm lose progress
        this.clear_canvas();
        this.tempo = proj_obj.tempo;
        this.set_tempo(this.tempo);
        this.scaleObj = teoria.note(proj_obj.tonic).scale(proj_obj.scaleName);
        this.rootNote = this.scaleObj.tonic.toString();
        console.log("ROOT NOTE:", this.rootNote);
        for (var i = 0; i < proj_obj.shapesList.length; i++) {
            var newShape = new Shape (/*this.rootNote, */DEFAULT_SYNTH, i, proj_obj.shapesList[i]);
            newShape.set_note_values();
            this.shapesList.push(newShape);
        }
        this.reset_all_notes();
        ACTIVE_SHAPE.id = this.shapesList.length;
        this.init_tempo();
        this.init_tonic_select();
        this.init_scale_select();
    }
}



/* ------------------------------- Shape class ------------------------------ */
class Shape {
    constructor(/*start_freq, */synth_name, id, savedData) {
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
                for (var j = parent.nodes.length - 1; j >= 0; j--) {
                    (parent.nodes[j]).handle.translate(dx - this.odx, dy - this.ody);
                    //parent.animCircle.translate(dx - this.odx, dy - this.ody);
                }
              
                var tempPath = parent.path.attr("path");

                for (var i = 0; i < tempPath.length - 1; i++) {
                    tempPath[i][1] += (dx - this.odx);
                    tempPath[i][2] += (dy - this.ody);
                }

                parent.path.attr("path", tempPath);

                this.odx = dx;
                this.ody = dy;
                this.drag = true;

                parent.update_pan();
            }
        },

        this.up = function (e) {
            if (this.drag == false && CURR_TOOL == "adjust") {
                e.stopPropagation();
                parent.show_details(e);
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
                parent.path.attr("stroke-width", volume_to_stroke_width(parent.volume));
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

        /* ----- Details ----- */
        this.show_details = function (event) {
            this.path.attr(shapeSelectedAttr);
            var x = event.clientX + 23;
            var y = event.clientY - 43;
            var i = parent.id;
            var popup = $("#shape-attr-popup-"+i);
            popup.css({left: x, top: y});
            popup.show();
        }

        /* ----- Delete ----- */
        this.delete = function () {
            this.stop();
            this.path.remove();
            
            this.part.removeAll();
            
            for (var i = this.nodes.length - 1; i >= 0; i--) {
                this.nodes[i].handle.remove();
            }
            this.included = false;
        }
        
        /* ----- Mute ----- */
        this.mute = function () {
            this.isMuted = true;
            this.synth.volume.value = -60;
            this.path.attr(shapeMutedAttr);
            for (var i = this.nodes.length - 1; i >= 0; i--) {
                this.nodes[i].handle.attr(shapeMutedAttr);
            }
            this.animCircle.attr(shapeMutedAttr);
        }
        
        this.unmute = function () {
            this.isMuted = false;
            console.log("unmute");
            this.path.attr(shapeDefaultAttr);
            for (var i = this.nodes.length - 1; i >= 0; i--) {
                this.nodes[i].handle.attr(handlesDefaultAttr);
                this.nodes[i].handle.attr("opacity", 1);
            }
            this.animCircle.attr(animCircleAttr);
            this.synth.volume.value = this.volume;
        }

        /* ============== variables and attributes ============== */
        
        // tone
        this.synth = synth_chooser(synth_name);
        this.pan = 0;        
        this.volume = -8;        
        this.panner = new Tone.Panner(this.pan).toMaster();
        this.isMuted = false;
        this.isMutedFromSolo = false;

        // path
        this.path = r.path().attr(shapeDefaultAttr);
        this.path.attr("stroke-width", volume_to_stroke_width(this.volume));
        this.path.hover(this.hoverIn(), this.hoverOut());
        this.path.drag(this.move, this.start, this.up);

        // nodes
        this.nodes = [];

        // properties
        this.length = function () {return (this.path.attr("path")).length};
        this.startFreqIndex = 0;
        this.startFreq;
        this.completed = false;
        this.included = true;

        // animation
        this.animCircle = r.circle(0, 0, 5).attr(animCircleAttr).toFront().hide();

        /* ============== load from saved shape ============== */
        if (savedData) {

            var pathList = savedData.pathList;

            this.completed = true;
            //this.start_freq = savedData.start_freq;
            this.startFreqIndex = savedData.startFreqIndex;

            this.volume = savedData.volume;
            this.path.attr("stroke-width", volume_to_stroke_width(this.volume));

            var pathString = "M" + pathList[0].x + "," + pathList[0].y
            var firstNode = new Node(pathList[0].x, pathList[0].y, 1, id);
            this.nodes.push(firstNode);

            for (var i = 1; i < pathList.length; i++) {
                pathString += "L" + pathList[i].x + "," + pathList[i].y
                var newNode = new Node(pathList[i].x, pathList[i].y, i+1, id);
                this.nodes.push(newNode);
            }

            pathString += "Z";
            this.path.attr("path", pathString);
            this.id = id;
            this.path.attr(shapeFilledAttr);
        }
        this.update_start_freq();
        this.update_pan();
        /* ============================================================= */
        /* ======================= PART CALLBACK ======================= */
        /* ============================================================= */
        this.part = new Tone.Part(function(time, value){
            
            //var parent = value.parent;
            //var thisSynth = get_this_synth(parent);
            var thisSynth = parent.synth.connect(parent.panner);
            //console.log("VALUE", value);
            
            if (parent.isMuted) {
                thisSynth.volume.value = -60;
            } else {
                thisSynth.volume.value = parent.volume;
            }

            parent.animCircle.show().toFront();
            
            var duration = value.dur;
            var lengthToMiliseconds = (value.noteDur * 1000).toFixed(9);
            //var duration = (lengthToMiliseconds / 1000).toFixed(12);
            var note = value.noteVal;
            console.log("note:", note);
            //console.log("DUR:", duration)
            //console.log("TO MIL:", lengthToMiliseconds)

            Tone.Draw.schedule(function(){
                var startX = value.nodeFrom.getX();
                var startY = value.nodeFrom.getY();
                var endX = value.nodeTo.getX();
                var endY = value.nodeTo.getY();

                parent.animCircle.attr({cx : startX, cy : startY})
                parent.animCircle.animate({"cx": endX, "cy": endY}, lengthToMiliseconds, function() {
                    //console.log("X,Y:", this.attr("cx"), this.attr("cy"));
                });

                parent.animCircle.animate(animCircleBangStartAttr, 0, "linear", function(){
                    this.animate(animCircleBangEndAttr, 800, "ease-out");
                });
                parent.path.animate(animCircleBangStartAttr, 0, "linear", function(){
                    this.animate(animCircleBangEndAttr, 800, "ease-out");
                });
            }, time)

            thisSynth.triggerAttackRelease(note, duration, time);

        }, []).start(0);
        this.part.loop = true;
    }
    update_start_freq () {
        console.log("update start freq");
        var startFreq = Tone.Frequency(PROJECT.rootNote).toMidi();
        console.log("params:", startFreq, this.startFreqIndex);
        var newStartFreq = transpose_by_scale_degree(startFreq, this.startFreqIndex);
        this.start_freq = newStartFreq;
        console.log(this.start_freq);
        this.refresh_shape_attr_popup();
    }
    update_pan () {
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
        console.log(xMean);
        this.panner.pan.value = xMean * 0.7;
    }
    stop () {
        this.synth.triggerRelease();
        this.animCircle.hide();
        //this.synth.volume.value = -60;
    }

    test () {
        console.log("wooo");
    }

    init_shape_attr_popup(){
        var i = this.id;
        var start_freq = this.start_freq;
        var popupHtml = '\
            <div class="shape-attr-popup" id="shape-attr-popup-'+i+'">\
                <div>\
                    <span>Shape: '+i+'</span>\
                    <!--<span class="close-popup" onclick="this.test()">X</span>-->\
                </div>\
                <div class="section">\
                    <label>Instrument:</label>\
                    <select class="shape-attr-inst-select" data="'+i+'">\
                        <option value="AM">AM</option>\
                        <option value="FM">FM</option>\
                        <option value="Marimba">Marimba</option>\
                        <option value="Duo">Duo</option>\
                        <option value="Mono">Mono</option>\
                        <option value="Super Saw">Super Saw</option>\
                        <option value="Simple" selected>Simple</option>\
                        <option value="Membrane">Membrane</option>\
                    </select>\
                </div>\
                <div class="section">\
                    <label>Starting Note:</label>\
                    <span class="shape-attr-start-freq">\
                        <span class="start-freq-label" id="start-freq-label-'+i+'">'+this.start_freq+'</span>\
                        <button class="arrow arrow-up" onclick="increment_start_freq(1,'+i+')"><i class="ion-arrow-up-b"></i></button>\
                        <button class="arrow arrow-down" onclick="increment_start_freq(0,'+i+')"><i class="ion-arrow-down-b"></i></button>\
                    </span>\
                </div>\
                <div class="section">\
                    Volume:\
                    <input type="range" class="signal-meter"\
                           value="'+this.volume+'" min="-18" max="0"\
                           oninput="update_vol('+i+', this.value)"\
                           onchange="update_vol('+i+', this.value)">\
                </div>\
                <div class="section mute-solo">\
                    <div class="button-cont mute-button-cont">\
                        <button class="shape-attr-mute" data=""\
                                onclick="mute_shape('+i+')">Mute</button>\
                    </div><div class="button-cont solo-button-cont">\
                        <button class="shape-attr-solo" data=""\
                                onclick="solo_shape('+i+')">Solo</button>\
                    </div>\
                </div>\
                <div class="section">\
                    <button class="shape-attr-delete-shape" data=""\
                            onclick="delete_shape('+i+')"\
                            onmouseover="delete_hoverin('+i+')"\
                            onmouseout="delete_hoverout('+i+')">Delete Shape</button>\
                </div>\
            </div>';
        $("body").append(popupHtml);
    }

    refresh_shape_attr_popup(){
        var i = this.id;
        $("#start-freq-label-"+i).html(this.start_freq);
    }

    set_note_values () {        
        console.log("SET NOTE VALUES");
        //console.log(this.part);
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
        
        var totalLength = delay + lastNoteInfo.noteDur;
        this.part.loopEnd = totalLength;
    }
    
    print_shape_info(){
        console.log("=== Printing shape info ===");
        for (var i = 0; i < this.nodes.length; i++) {
            console.log(i);
            console.log("noteval", this.nodes[i].noteVal);
            console.log("duration", this.nodes[i].duration);
        }
    }

    /* returns an object containing note information - for the note from nodePrev to node
    nodePrevPrev needed to calculate angle at node Prev
    */
    get_note_info(node, nodePrev, nodePrevPrev){
        
        var noteVal;
        var duration = (lineDistance(node, nodePrev) * PROJECT.tempo) / 1000;
        var isFirst = false;
        
        if (!nodePrevPrev) {
            isFirst = true;
            noteVal = this.start_freq;
        } else {
            var theta = Raphael.angle(node.getX(), node.getY(), 
                                      nodePrevPrev.getX(), nodePrevPrev.getY(), 
                                      nodePrev.getX(), nodePrev.getY());
            noteVal = NOTE_CHOOSER(nodePrev.noteVal, theta);
        }
        //var theta = Raphael.angle(0,0,4,3,4,0);
        //console.log("TEST THETA:", theta);
        node.noteVal = noteVal;
        node.noteDur = duration;
        var result = {
            noteVal : noteVal,
            noteDur : duration,
            nodeTo : node,
            nodeFrom : nodePrev,
            isFirst : isFirst
        }
        return result;
    }
}


/* --------------------------- Vertex Handle class -------------------------- */
class Node {
    constructor(x, y, i, shapeId) {

        // if first node
        if ((i-1) == 0) {
            this.discattr = {fill: "#000", stroke: "#000", "stroke-width": 1};
            this.isFirst = true;
        } else {
            this.discattr = {fill: "#eee", stroke: "#000", "stroke-width": 2};
            this.isFirst = false;
        }
        
        // handle
        this.handle = r.circle(x,y,3).attr(this.discattr).hide();
        if (this.isFirst) {this.handle.show();}
        
        this.id = shapeId;
        var parent = this;
        
        this.handle.update_shape_path = function (x, y) {
            var currShape = PROJECT.shapesList[parent.id];
            var tempPath = currShape.path.attr("path");

            tempPath[i-1][1] += x;
            tempPath[i-1][2] += y;

            currShape.path.attr("path", tempPath);
        }

        this.move = function (dx, dy) {
            if (CURR_TOOL == "adjust") {
                console.log("NODE MOVE");
                dx = snap_to_grid(dx);
                dy = snap_to_grid(dy);

                var cx = this.attr("cx");
                var cy = this.attr("cy");
                
                var newx = cx + dx - (this.odx || 0);
                var newy = cy + dy - (this.ody || 0);
                
                this.attr("cx", newx);
                this.attr("cy", newy);

                /*this.translate(dx - (this.odx || 0), dy - (this.ody || 0));*/
                this.update_shape_path(dx - (this.odx || 0), dy - (this.ody || 0));
                
                this.odx = dx;
                this.ody = dy;
                // TODO ?
                PROJECT.shapesList[shapeId].set_note_values();
            }
        }

        this.up = function (){
            if (CURR_TOOL == "adjust") {
                this.odx = this.ody = 0;
            }
        }

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
        
        this.hide = function () {
            this.handle.hide();
        }

        this.show = function () {
            this.handle.show();
        }

        this.getX = function () {
            var transform = this.handle.matrix.split();
            return this.handle.attr("cx") + transform.dx;
        }
        
        this.getY = function () {
            var transform = this.handle.matrix.split();
            return this.handle.attr("cy") + transform.dy;
        }

        this.handle.drag(this.move, this.up);
        this.handle.hover(this.hoverIn(this.handle), this.hoverOut(this.handle));
    }
}




/* ========================================================================== */
/* ========================================================================== */
/* ========================================================================== */
/* ----------------------------- DOCUMENT READY ----------------------------- */
/* ========================================================================== */
/* ========================================================================== */
/* ========================================================================== */

var PROJECT = new Project;
var ACTIVE_SHAPE = new Shape(/*PROJECT.rootNote, */DEFAULT_SYNTH, PROJECT.shapesList.length );

$(document).ready(function() {

    /* ---------------------- INITIALIZE ---------------------- */

    init_grid();
    hide_handles();

    hide_menu();
    hide_info_pane();

    /* ----------------------- HANDLERS ----------------------- */
    window.onkeydown = function (e) {
        // TAB
        if (e.which == 9) {
            console.log("tab");
            if (CURR_TOOL === "draw") {
                select_tool("adjust");
            } else if (CURR_TOOL === "adjust") {
                select_tool("draw");
            }
            e.preventDefault();
            //select_tool("draw");
        }
        // SPACE
        if (e.which === 32) { 
            if (e.stopPropagation) {
                e.stopPropagation();
                e.preventDefault();
            }
            togglePlayStop();
        }
    };

    // PLAY - toggles play / stop
    $(".play-stop-toggle").click(function(){
        togglePlayStop();
    });

    // changes global tempo
    $(".tempo-slider").on("mouseup", function () {
        //console.log(this.value);
        PROJECT.set_tempo(this.value * -1);
    })

    // changes global musical key 
    $(document).on('change','.scale-select',function(){
        //console.log(this.value);
        PROJECT.set_scale(this.value);
    });

    $(document).on('change','.tonic-select',function(){
        //console.log(this.value);
        PROJECT.set_tonic(this.value);
    });

    // stops click propegation when clicking in the tool tip
    $( ".shape-attr-popup" ).on( "mousedown", function( event ) {
        event.stopPropagation();
    });

    $(document).on('change','.signal-meter',function(){
        console.log(this.value);
    });

    // changes instrument to the one selected from the dropdown
    $(document).on('change','.shape-attr-inst-select',function(){
        console.log($(this).attr("data"));
        var i = $(this).attr("data");
        console.log("changing to", this.value);
        PROJECT.shapesList[i].synth.triggerRelease();
        PROJECT.shapesList[i].synth = synth_chooser(this.value);
    });

    // CLEAR - hide tooltips, stop transport, remove all shapes
    $(".clear").click(function(){
        PROJECT.clear_canvas();
    });
    
    /* TOOLS */
    $("#draw-tool").click(function(){
        select_tool("draw");
    });

    $("#adjust-tool").click(function(){
        select_tool("adjust");
    });
    
    // TOGGLE GRID
    $("#grid").click(function(){
        if ($("#grid").is(":checked")) {
            show_grid();
        } 
        else {
            hide_grid();
        }
    });

    /* Holder Mouse move */
    $( "#holder" ).on( "mousemove", function( event ) {
        var x = event.pageX - GLOBAL_MARGIN;
        var y = event.pageY - GLOBAL_MARGIN;
        
        x = snap_to_grid(x);
        y = snap_to_grid(y);

        if ((ACTIVE_SHAPE.path.attr("path")).length) {
            var origin_x = ACTIVE_SHAPE.path.attr("path")[0][1];
            var origin_y = ACTIVE_SHAPE.path.attr("path")[0][2];
        }

        if (x < (origin_x + ORIGIN_RADIUS) && x > (origin_x - ORIGIN_RADIUS) && 
                y < (origin_y + ORIGIN_RADIUS) && y > (origin_y - ORIGIN_RADIUS)) {
            x = origin_x;
            y = origin_y;
            ACTIVE_SHAPE.path.attr(shapeFilledPreviewAttr);
            //HOVER_OVER_ORIGIN = true;
        } 
        else {
            ACTIVE_SHAPE.path.attr("fill", "");
        }

        var endpoint = "L" + x + "," + y;
        //console.log(hoverCircle);
        hoverCircle.attr({cx: x, cy: y});
        //hoverCircle.remove();
        //hoverCircle = r.circle(x,y,3).attr(hoverCircleAttr).toBack();

        if (hoverLine.attr("path")) {
            hoverLine.attr("path", subpath_to_string(hoverLine, 0) + endpoint);
        }
    });
    /* Holder Mouse Click */
    $( "#holder" ).on( "mousedown", function( event ) {
        if ($(".shape-attr-popup").is(":visible")) {
            hide_details();
        }
        
        if (CURR_TOOL == "draw") {

            var x = event.pageX - GLOBAL_MARGIN;
            var y = event.pageY - GLOBAL_MARGIN;
            
            x = snap_to_grid(x);
            y = snap_to_grid(y);

            var prev_n = [];

            if ((ACTIVE_SHAPE.path.attr("path")).length) {
                var origin_x = ACTIVE_SHAPE.path.attr("path")[0][1];
                var origin_y = ACTIVE_SHAPE.path.attr("path")[0][2];
                prev_n = ACTIVE_SHAPE.path.attr("path")[ACTIVE_SHAPE.length() - 1];
            }

            if (x < (origin_x + ORIGIN_RADIUS) && x > (origin_x - ORIGIN_RADIUS) && 
                y < (origin_y + ORIGIN_RADIUS) && y > (origin_y - ORIGIN_RADIUS)) {
                set_draw_state("ready");
                complete_active_shape();
            } else {        
                PREV_ENDPOINT = "M" + x + "," + y;
                var moveTo = "M" + x + "," + y;
                var lineTo = "L" + x + "," + y;

                hoverLine.attr("path", moveTo);                

                if (ACTIVE_SHAPE.path.attr("path") === "") { // shape is empty
                    set_draw_state("drawing");
                    ACTIVE_SHAPE.path.attr("path", moveTo);
                    ACTIVE_SHAPE.animCircle.show();
                } else {
                    ACTIVE_SHAPE.path.attr("path", path_to_string(ACTIVE_SHAPE.path) + lineTo);
                }
                var newNode = new Node(x, y, ACTIVE_SHAPE.length(), PROJECT.shapesList.length);
                ACTIVE_SHAPE.nodes.push(newNode);
            }
        }
    });
});


/* ========================================================================== */
/* ========================================================================== */
/* ========================================================================== */
/* -------------------------------- FUNCTIONS ------------------------------- */
/* ========================================================================== */
/* ========================================================================== */
/* ========================================================================== */




/* ========================================================================== */
/* ------------------------------- TRANSPORT -------------------------------- */
/* ========================================================================== */

function play_handler() {
    // TODO
    //$("#disable-overlay").show();
    console.log(CURR_DRAW_STATE);
    if (CURR_DRAW_STATE === "ready") {
        $(".play-stop-toggle").html("<i class='ion-stop'></i>");
        PLAYING = true;
        Tone.Master.mute = false;
        Tone.Transport.start("+0.1");
    }
}

function stop_handler(){
    // TODO
    //$("#disable-overlay").hide();
    $(".play-stop-toggle").html("<i class='ion-play'></i>");
    PLAYING = false;
    for (var i = PROJECT.shapesList.length - 1; i >= 0; i--) {
        if (PROJECT.shapesList[i].included) {
            PROJECT.shapesList[i].stop();
        }        
    }
    Tone.Transport.stop(0);
    Tone.Master.mute = true;
    //Tone.Master.dispose();

}

function togglePlayStop () {
    console.log(PLAYING);
    if (PLAYING) { // we stop
        stop_handler();

    } else { // we play
        play_handler();
    }
}

/* ========================================================================== */
/* ---------------------------------- GRID ---------------------------------- */
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
    for (var i = PROJECT.shapesList.length - 1; i >= 0; i--) {
        PROJECT.shapesList[i].hide_handles();
    }
}

function show_handles () {
    for (var i = PROJECT.shapesList.length - 1; i >= 0; i--) {
        PROJECT.shapesList[i].show_handles();
    }
}

function hide_details () {
    for (var i = PROJECT.shapesList.length - 1; i >= 0; i--) {
        PROJECT.shapesList[i].path.attr(shapeFilledAttr);
    }
    $(".shape-attr-popup").hide();
}

/* -------- TOOLS -------- */
function select_tool(tool) {
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

function set_draw_state(state){
    if (state === "ready") {
        //$(".menu ul li a").prop('disabled', false);
        $(".controls button").prop('disabled', false);
        $(".controls input").prop('disabled', false);
        $(".controls select").prop('disabled', false);
    } else if (state === "drawing") {
        //$(".menu ul li a").prop('disabled', true);
        $(".controls button").prop('disabled', true);
        $(".controls input").prop('disabled', true);
        $(".controls select").prop('disabled', true);
    }
    CURR_DRAW_STATE = state;
}


/* ========================================================================== */
/* ------------------------------ SHAPE ACTIONS ----------------------------- */
/* ========================================================================== */

/* completes the ACTIVE SHAPE: finishes the path by connecting the latest point
   to the origin. Adds the shape to PROJECT.shapesList. Initializes new shape 
*/
function complete_active_shape(){

    ACTIVE_SHAPE.path.attr("path", path_to_string(ACTIVE_SHAPE.path) + "Z");
    ACTIVE_SHAPE.path.attr(shapeFilledAttr);
    ACTIVE_SHAPE.init_shape_attr_popup();

    ACTIVE_SHAPE.set_note_values();
    ACTIVE_SHAPE.update_pan();

    PROJECT.shapesList.push(ACTIVE_SHAPE);

    ACTIVE_SHAPE = new Shape(/*PROJECT.rootNote, */DEFAULT_SYNTH, PROJECT.shapesList.length);

    hoverLine.attr("path", "");
    PREV_ENDPOINT = "";
    
    console.log(PROJECT.shapesList);
}

/* ------ Delete ------- */

function delete_shape (i) {
    PROJECT.shapesList[i].delete();
    $(".shape-attr-popup").hide();
    //console.log(PROJECT.shapesList);
}

function delete_hoverin (i) {
    PROJECT.shapesList[i].path.attr(shapeWarningAttr);
    for (var j = PROJECT.shapesList[i].nodes.length - 1; j >= 0; j--) {
        //PROJECT.shapesList[i].nodes[j].handle.attr(handlesWarningAttr);
        PROJECT.shapesList[i].nodes[j].handle.hide();
    }
}

function delete_hoverout (i) {
    PROJECT.shapesList[i].path.attr(shapeSelectedAttr);
    for (var j = PROJECT.shapesList[i].nodes.length - 1; j >= 0; j--) {
        //PROJECT.shapesList[i].nodes[j].handle.attr(handlesDefaultAttr)
        PROJECT.shapesList[i].nodes[j].handle.show();
    }
}

/* ------ Mute ------- */

function mute_shape(i) {
    PROJECT.shapesList[i].mute();
    //unsolo_shape(i);
    var unmuteHtml = '<button class="shape-attr-mute shape-attr-unmute" data=""\
                            onclick="unmute_shape('+i+')">Unmute</button>';
    $("#shape-attr-popup-"+i+" .mute-button-cont").html(unmuteHtml);
}

function unmute_shape(i) {
    PROJECT.shapesList[i].unmute();
    var muteHtml = '<button class="shape-attr-mute" data=""\
                            onclick="mute_shape('+i+')">Mute</button>';
    $("#shape-attr-popup-"+i+" .mute-button-cont").html(muteHtml);
}

/* ------ Solo ------- */

function solo_shape(id) {
    unmute_shape(id);
    for (var i = PROJECT.shapesList.length - 1; i >= 0; i--) {
        if (i != id) {
            //unsolo_shape(i);
            if (PROJECT.shapesList[i].isMuted == false) {
                PROJECT.shapesList[i].isMutedFromSolo = true;
                mute_shape(i);
            }
        }
    }
    //PROJECT.shapesList[i].solo();
    var unsoloHtml = '<button class="shape-attr-solo shape-attr-unsolo" data=""\
                            onclick="unsolo_shape('+id+')">Unsolo</button>';
    $("#shape-attr-popup-"+id+" .solo-button-cont").html(unsoloHtml);
}

function unsolo_shape(id) {
    for (var i = PROJECT.shapesList.length - 1; i >= 0; i--) {
        if (i != id) {
            //unsolo_shape(i);
            if (PROJECT.shapesList[i].isMutedFromSolo) {
                PROJECT.shapesList[i].isMutedFromSolo = false;
                unmute_shape(i);
            }
        }
    }
    //PROJECT.shapesList[i].unsolo();
    var soloHtml = '<button class="shape-attr-solo" data=""\
                            onclick="solo_shape('+id+')">Solo</button>';
    $("#shape-attr-popup-"+id+" .solo-button-cont").html(soloHtml);
}

/* ------ Volume ------- */

function update_vol(i, val){
    //console.log(val);
    PROJECT.shapesList[i].volume = val;
    PROJECT.shapesList[i].synth.volume.value = val;
    update_stroke_width(i, volume_to_stroke_width (val));
}

function update_stroke_width(i, val) {
    console.log(val);
    PROJECT.shapesList[i].path.attr("stroke-width", val);
}

/* ------ Start Freq ------- */

function increment_start_freq(dir, i){
    //console.log(this);
    var freq = PROJECT.shapesList[i].start_freq;
    var note = Tone.Frequency(freq).toMidi();

    console.log(freq);
    var new_freq;

    if (dir === 1) { //up;
        new_freq = transpose_by_scale_degree(note, 1)
        PROJECT.shapesList[i].startFreqIndex++;
    }  
    if (dir === 0) { //down
        new_freq = transpose_by_scale_degree(note, -1)
        PROJECT.shapesList[i].startFreqIndex--;
    }
    PROJECT.shapesList[i].update_start_freq();
    PROJECT.shapesList[i].set_note_values();
    //PROJECT.shapesList[i].refresh_shape_attr_popup();
}

/* ------ Instrument ------- */

function change_instrument (i){
    PROJECT.shapesList[i].synth.triggerRelease();
    PROJECT.shapesList[i].synth = synth_chooser(this.value);
}



/* ========================================================================== */
/* ------------------------------ NOTE CHOOSING ----------------------------- */
/* ========================================================================== */

function indexOfNote(letter, scale) {
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
    var noteIndex = indexOfNote(noteLetter, scaleSimple);
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
    return(newNote);
}

function note_chooser1(freq, theta) {
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
        if(isBetween(absTheta, lowerBound, upperBound)) {
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
   
function synth_chooser (name) {
    var synth = new Tone.AMSynth();

    switch(name) {
        case "AM":
            synth = new Tone.AMSynth();
            break;
        case "FM":
            synth = new Tone.FMSynth();
            break;
        case "Duo":
            synth = new Tone.DuoSynth();
            break;
        case "Metal":
            synth = new Tone.MetalSynth();
            break;
        case "Marimba":
            synth = new Tone.Synth( 
                {
                    "oscillator": {
                        "partials": [
                            1,
                            0,
                            2,
                            0,
                            3
                        ]
                    },
                    "envelope": {
                        "attack": 0.001,
                        "decay": 1.2,
                        "sustain": 0,
                        "release": 1.2
                    }
                });
            break;
        case "Mono":
            synth =  new Tone.MonoSynth(
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
            break;
        case "Super Saw":
            synth =  new Tone.Synth(
                   {
                    "oscillator" : {
                        "type" : "fatsawtooth",
                        "count" : 3,
                        "spread" : 30
                    },
                    "envelope": {
                        "attack": 0.01,
                        "decay": 0.1,
                        "sustain": 0.5,
                        "release": 0.4,
                        "attackCurve" : "exponential"
                    }
                });
            break;
        case "Simple":
            synth = new Tone.Synth();
            break;
        case "Membrane":
            synth = new Tone.MembraneSynth();
            break;
        default:
    }
    return synth.toMaster();
}


/* ========================================================================== */
/* -------------------------------- HELPER  --------------------------------- */
/* ========================================================================== */


function lineDistance( point1, point2 ) {
    var xs = 0;
    var ys = 0;
    xs = point2.getX() - point1.getX();
    xs = xs * xs;
    ys = point2.getY() - point1.getY();
    ys = ys * ys;
    return Math.sqrt( xs + ys );
}

function isBetween (val, a, b) {
    return (val > a && val <= b);
}

function path_to_string(path){
    return path.attr("path").join()
}

function subpath_to_string(path, i){
    return path.attr("path")[i].join()
}

function volume_to_stroke_width (vol) {
    vol = parseInt(vol);
    if (vol < -10) {
        return 1;
    } else if (vol < -5) {
        return 2;
    } else {
        return 3;
    }
}


/* ========================================================================== */
/* ---------------------------------- Menu ---------------------------------- */
/* ========================================================================== */

$(".show-hide-menu").on("click", function(){
    console.log($(".menu").css("top"));
    if ($(".menu").css("top") == "0px") {
        hide_menu()
    } else {
        show_menu()
    }
});

function show_menu() {
    $(".menu").animate({"top":0}, 200);
    $(".controls").animate({"top":"15px"}, 200);
    $(".show-hide-menu").html('<i class="ion-chevron-up"></i>');
}

function hide_menu() {
    $(".menu").animate({"top":"-19px"}, 200);
    $(".controls").animate({"top":0}, 200);
    $(".show-hide-menu").html('<i class="ion-chevron-down"></i>');
}


/* =========== */

$(".show-hide-info-pane").on("click", function(){
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
}


/* ============================= Fullscreen ================================= */

$(".enter-fullscreen").on("click", function(){
    toggleFullScreen();
});

function toggleFullScreen() {
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

function onFullScreenChange() {
    var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
    if (fullscreenElement) {
        $(".enter-fullscreen").html('<i class="ion-arrow-shrink"></i>')
    } else  {
        $(".enter-fullscreen").html('<i class="ion-arrow-expand"></i>')
    }
    init_grid();

    if ($("#grid").is(":checked")) {show_grid();} 
    else {hide_grid();}
}


/* ========================================================================== */
/* ================================ Project ================================= */
/* ========================================================================== */
var projectData;
function project_dump(){
    projectData = PROJECT.dump()
   /* var proj_obj = [];
    for (var i = 0; i < shapesList.length ; i++) {
        var currShape = shapesList[i];
        if (currShape.included) {
            var coords = []
            for (var j = 0; j < currShape.nodes.length; j++) {
                var p = {
                    x: currShape.nodes[j].getX(),
                    y: currShape.nodes[j].getY(),
                }
                coords.push(p);
            }
            var shapeData = {
                pathList: coords,
                start_freq: currShape.start_freq,
                volume: currShape.volume,
                isMuted: currShape.isMuted
            }
            proj_obj.push(shapeData);
        }
    }
    return proj_obj;*/
}

function project_load(/*proj_obj*/){
    //PROJECT = null;
    PROJECT.load(projectData);

/*    for (var i = 0; i < proj_obj.length; i++) {
        var newShape = new Shape (ROOT_NOTE, DEFAULT_SYNTH, i, proj_obj[i]);
        newShape.set_note_values();
        shapesList.push(newShape);
    }*/
}
