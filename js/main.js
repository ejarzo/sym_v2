/* =============================================================================
    
    SHAPE YOUR MUSIC
    
    A web application for composing visually. Shapes are loops, where each side
    is a note. The melodies are determined by the angles between sides.

    Charlie Colony and Elias Jarzombek
    Code written by Elias Jarzombek

============================================================================= */
Tone.Transport.latencyHint = 'fastest'

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
var shapeDefaultAttr        = {stroke: black, "stroke-width": 2};
var shapeHoverAttr          = {"stroke-width": 3};
var shapeFilledPreviewAttr  = {fill: "rgba(120,120,120,.1)", stroke: black, "stroke-width": 2};
var shapeFilledAttr         = {fill: "rgba(100,100,100,.2)", stroke: black, "stroke-width": 2};
var shapeWarningAttr        = {fill: warningRed, stroke: warningRed};
var shapeSelectedAttr       = {fill: "rgba(0,0,0,.5)", stroke: black, "stroke-width": 3};

/* animated circle */
var animCircleAttr          = {"fill": "#111", "stroke": "#111", "stroke-width": 2};
var animCircleBangStartAttr = {"r": 7, "fill": "#fff"};
var animCircleBangEndAttr   = {"r": 3, "fill": "#111"};

/* handles */
var handlesWarningAttr = {"opacity": 0.2};
var handlesDefaultAttr = {"opacity": 1};

/* hover hint */
var hoverCircleAttr   = {fill: "#AAA", stroke: "#aaa"};
var hoverLineAttr     = {"stroke": "#AAA", "stroke-width": "2"};

/* grid */
var gridDotAttr       = {"fill": "#777", "stroke-width": 1, "stroke": "#FFF"};

/* --------------------------------- GLOBALS -------------------------------- */

// AUDIO
var TEMPO = 6;
var ORIGIN_RADIUS = 15;
var ROOT_NOTE = "C2";
var PLAYING = false;
var DEFAULT_SYNTH = "FM";
var PRESETS = new Presets();
// SCALE
var MAJOR_INTERVALS = [2,2,1,2,2,2,1];
var MINOR_INTERVALS = [2,1,2,2,1,2,2];

var ROOT_MIDI = Tone.Frequency(ROOT_NOTE).toMidi();
var INTERVALS = MAJOR_INTERVALS;

var SCALE_LETTERS = ["A", "B", "C", "D", "E", "F", "G"];

var NOTE_CHOOSER = note_chooser1;

// GRID
var GRID_SIZE = 50;
var GLOBAL_MARGIN = 5;
var gridDots = r.set();

// TOOLS: draw, adjust
var CURR_TOOL = "draw";

// LINE TO MOUSE
var PREV_ENDPOINT;
var hoverLine = r.path().attr(hoverLineAttr);
var hoverCircle = r.circle(0,0,3).attr(hoverCircleAttr);




/* ------------------------------- Shape class ------------------------------ */
class Shape {
    constructor(start_freq, synth_name) {
        
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
                $("#details").hide();
                var i = this.data("i");
                var currShape = shapesList[i];
                
                dx = snap_to_grid(dx);
                dy = snap_to_grid(dy);

                for (var j = currShape.nodes.length - 1; j >= 0; j--) {
                    (currShape.nodes[j]).handle.translate(dx - this.odx, dy - this.ody);
                }
              
                var tempPath = currShape.path.attr("path");

                for (var i = 0; i < tempPath.length - 1; i++) {
                    tempPath[i][1] += (dx -this.odx);
                    tempPath[i][2] += (dy -this.ody);
                }

                currShape.path.attr("path", tempPath);

                this.odx = dx;
                this.ody = dy;

                this.drag = true;
            }

        },
        this.up = function (e) {
            if (this.drag == false && CURR_TOOL == "adjust") {
                e.stopPropagation();
                //console.log(e);
                var i = this.data("i");
                var currShape = shapesList[i];
                
                currShape.show_details(e);
            }
            this.odx = this.ody = 0;
            //hide_details();
            //console.log("up")
        };
        
        /* ----- Hover ----- */
        this.hoverIn = function (item) {
            return function (event) {
                if (CURR_TOOL == "adjust") {
                    item.path.attr(shapeHoverAttr);
                    //item.path.attr("cursor", "move");
                    //var id = item.path.id;
                }
            };
        };

        this.hoverOut = function (item) {
            return function (event) {
                item.path.attr(shapeDefaultAttr);
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
            var i = this.path.data("i");
            var popup = $("#shape-attr-popup-"+i);
                        
            //console.log(popup);
            popup.css({left: x, top: y});
            popup.show();

            //this.path.attr({stroke: "#f00"});
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
        
        this.reset_anim_circle_position = function() {
            var origin = this.nodes[0];
            var ox = origin.handle.attr("cx");
            var oy = origin.handle.attr("cy");
            this.animCircle.attr({"cx": ox, "cy": oy});
            //this.animCircle.hide();
        }
        /* ======================================= */

        // path
        this.path = r.path().attr(shapeDefaultAttr);
        this.path.hover(this.hoverIn(this), this.hoverOut(this));
        this.path.drag(this.move, this.start, this.up);
        this.dragging = false;

        // nodes
        this.nodes = [];

        // properties
        this.length = function () {return (this.path.attr("path")).length};
        this.set_start_freq(start_freq);
        this.completed = false;
        this.loop = false;
        this.included = true;

        // animation
        this.animCircle = r.circle(0, 0, 5).attr(animCircleAttr).toFront().hide();
        this.animCircle.attr("progress", 0);
        this.anim;

        // tone
        this.synth = synth_chooser(synth_name);
        //this.synth = PRESETS.preset01;
        //var synth = this.synth;
        this.part = new Tone.Part(function(time, value){
            /* PART CALLBACK */
            var parentShape = value.parentShape;
            var thisSynth = get_this_synth(parentShape);

            console.log("VALUE", value);
            
            thisSynth.volume.value = -5;
            parentShape.animCircle.show().toFront();
            
            //var duration = value.dur;
            var lengthToMiliseconds = (value.noteDur * 1000).toFixed(9);
            var duration = (lengthToMiliseconds / 1000).toFixed(12);
            var note = value.noteVal;
            
            console.log("DUR:", duration)
            console.log("TO MIL:", lengthToMiliseconds)

            if (value.first) {
                parentShape.reset_anim_circle_position();
              /*  parentShape.animCircle.attr("progress", 0);
                var length = ((parentShape.path.getTotalLength() * TEMPO) / 1000) * 1000;

                parentShape.animCircle.data("mypath", parentShape.path);
                parentShape.anim = Raphael.animation({progress: 1}, length);
                parentShape.animCircle.animate(parentShape.anim);*/
            }


            Tone.Draw.schedule(function(){
                var startX = value.nodeFrom.handle.attr("cx");
                var startY = value.nodeFrom.handle.attr("cy");
                var endX = value.nodeTo.handle.attr("cx");
                var endY = value.nodeTo.handle.attr("cy");

                parentShape.animCircle.attr({cx : startX, cy : startY})
                parentShape.animCircle.animate({"cx": endX, "cy": endY}, lengthToMiliseconds, function() {
                    console.log("X,Y:", this.attr("cx"), this.attr("cy"));
                });

                parentShape.animCircle.animate(animCircleBangStartAttr, 0, "linear", function(){
                    this.animate(animCircleBangEndAttr, 800, "ease-out");
                });
            }, time)

            thisSynth.triggerAttackRelease(note, duration, time);

        }, []).start(0);
        this.part.loop = true;
    }
    set_start_freq (freq) {
        console.log(this.start_freq);
        console.log("setting start freq:", freq);
        this.start_freq = freq;
    }

    stop () {
        // TODO
        this.animCircle.hide();
        this.synth.volume.value = -60;
        this.animCircle.stop(this.anim);

        this.anim = "";
        this.animCircle.attr("progress", 0);
    }
    
    init_shape_attr_popup(){
        var i = this.path.data("i");
        //console.log("====>", i);
        var start_freq = this.start_freq;
        var test = this.delete;
        var popupHtml = '\
            <div class="shape-attr-popup" id="shape-attr-popup-' + i + '">\
                <!-- <div>\
                    <span class="hide-details" onclick="">X</span>\
                </div> -->\
                <div class="section">\
                    <label>Instrument:</label>\
                    <select class="shape-attr-inst-select" data="'+i+'">\
                        <option value="AM">AM</option>\
                        <option value="FM">FM</option>\
                        <option value="Duo">Duo</option>\
                        <option value="Poly">Poly</option>\
                        <option value="Simple">Simple</option>\
                        <option value="Membrane">Membrane</option>\
                    </select>\
                </div>\
                <div class="section">\
                    <label>Starting Note:</label>\
                    <span class="shape-attr-start-freq">\
                        <span class="start-freq-label" id="start-freq-label-'+i+'">'+start_freq+'</span>\
                        <button class="arrow arrow-up" onclick="increment_start_freq(1,'+i+')">&#9650;</button>\
                        <button class="arrow arrow-down" onclick="increment_start_freq(0,'+i+')">&#9660;</button>\
                    </span>\
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



    set_note_values () {        
        console.log("SET NOTE VALUES");
        console.log(this.part);
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


/*        console.log("=================================");

        for (var i = 0; i < this.nodes.length; i++) {
            console.log(i);
            console.log("noteval", this.nodes[i].noteVal);
            console.log("duration", this.nodes[i].duration);
        }*/
    }

    /* returns an object containing note information - for the note from nodePrev to node
    nodePrevPrev needed to calculate angle at node Prev
    */
    get_note_info(node, nodePrev, nodePrevPrev){
        
        var noteVal;
        var duration = (lineDistance(node, nodePrev) * TEMPO) / 1000;
        var parentShape = this;
        var isFirst = false;
        
        if (!nodePrevPrev) {
            isFirst = true;
            noteVal = this.start_freq;
        } else {
            var theta = Raphael.angle(getNodeX(node), getNodeY(node), getNodeX(nodePrevPrev), getNodeY(nodePrevPrev), getNodeX(nodePrev), getNodeY(nodePrev));
            noteVal = NOTE_CHOOSER(nodePrev.noteVal, theta);
        }
        //var theta = Raphael.angle(0,0,4,3,4,0);
        //console.log("TEST THETA:", theta);
        node.noteVal = noteVal;
        node.noteDur = duration;
        var result = {
            noteVal : noteVal,
            noteDur : duration,
            parentShape : parentShape,
            nodeTo : node,
            nodeFrom : nodePrev,
            isFirst : isFirst
        }

        return result;
    }
}






















function getNodeX (node) {
    // TODO
    var odx = node.handle.attr("odx");
    if (odx) {
        return node.handle.attr("cx") + odx;
    } else return node.handle.attr("cx");
}

function getNodeY (node) {
    // TODO
    var ody = node.handle.attr("ody");
    if (ody) {
        return node.handle.attr("cy") + ody;
    } else return node.handle.attr("cy");
}

/* --------------------------- Vertex Handle class -------------------------- */
class Node {
    constructor(x, y, i, shapeId) {

        // if first node
        if ((i-1) == 0) {
            this.discattr = {fill: "#000", stroke: "#000", "stroke-width": 1, opacity: 1};
            this.isFirst = true;
        } else {
            this.discattr = {fill: "#eee", stroke: "#000", "stroke-width": 2, opacity: 0};
        }
        
        // handle
        this.handle = r.circle(x,y,3).attr(this.discattr);
        this.handle.data("i", i);
        this.handle.data("shapeId", shapeId);

        //this.parentShape = shapesList[shapeId];
        //console.log(this.parentShape);
        //this.noteVal = this.parentShape.start_freq;


        this.handle.click(function(){
            console.log("NODE CLICK");
            //console.log("index:", this.data("i"));
            //console.log("X", this.attr("cx"), "Y", this.attr("cy"));
            //console.log("parent shape:", shapesList[shapeId]);
            shapesList[shapeId].set_note_values();
        });
        
        this.handle.control_update = function (x, y) {
            var i = this.data("i");
            var currShapeId = this.data('shapeId');

            var currShape = shapesList[currShapeId];
            var tempPath = currShape.path.attr("path");

            tempPath[i-1][1] += x;
            tempPath[i-1][2] += y;

            currShape.path.attr("path", tempPath);
        }

        this.move = function (dx, dy) {
            if (CURR_TOOL == "adjust") {
                dx = snap_to_grid(dx);
                dy = snap_to_grid(dy);

                var cx = this.attr("cx");
                var cy = this.attr("cy");
                
                var newx = cx + dx - (this.odx || 0);
                var newy = cy + dy - (this.ody || 0);
                
                this.attr("cx", newx);
                this.attr("cy", newy);

                /*this.translate(dx - (this.odx || 0), dy - (this.ody || 0));*/
                this.control_update(dx - (this.odx || 0), dy - (this.ody || 0));
                
                this.odx = dx;
                this.ody = dy;
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
                    item.attr("r", "5");
                    item.attr("stroke-width", "3");
                }
            };
        };

        this.hoverOut = function (item) {
            return function (event) {
                if (CURR_TOOL == "adjust") {
                    item.attr("r", "3");
                    item.attr("stroke-width", "2");
                };
            };
        };
        
        this.hide = function () {
            this.handle.attr("opacity", 0);
        }

        this.show = function () {
            this.handle.attr("opacity", 1);
        }

        this.handle.drag(this.move, this.up);
        this.handle.hover(this.hoverIn(this.handle), this.hoverOut(this.handle));
    }
}

/* SHAPES */
var shapesList = [];
var ACTIVE_SHAPE = new Shape(ROOT_NOTE, DEFAULT_SYNTH);



/* -------------------------------------------------------------------------- */
/* ----------------------------- DOCUMENT READY ----------------------------- */
/* -------------------------------------------------------------------------- */
function play_handler() {
    // TODO
    PLAYING = true;
    Tone.Transport.start("+0.1");
}

function stop_handler(){
    // TODO
    PLAYING = false;
    Tone.Transport.stop();

    for (var i = shapesList.length - 1; i >= 0; i--) {
        if (shapesList[i].included) {
            shapesList[i].stop();
        }        
    }
}

function togglePlayStop () {
    console.log(PLAYING);
    if (PLAYING) { // we stop
        stop_handler();
        $("#disable-overlay").hide();
        $(".play-stop-toggle-icon").html("play_arrow");
    } else { // we play
        play_handler();
        $("#disable-overlay").show();
        $(".play-stop-toggle-icon").html("stop");
    }
}

$(document).ready(function() {

    /* ---------------------- INITIALIZE ---------------------- */

    init_grid();
    hide_handles();
    

    /* ----------------------- HANDLERS ----------------------- */
    window.onkeydown = function (e) {

    /* $(window).keypress(function(e) {*/
        if (e.which === 97) { // a
            console.log("a");
            select_tool("draw");
        }
        if (e.which === 115) { // s
            console.log("s");
            select_tool("adjust");
        }
        if (e.which === 32) {
            if (e.stopPropagation) {
                e.stopPropagation();
                e.preventDefault();
            }
            togglePlayStop();
        }
    };

    // PLAY - toggles play / stop
    $("#play-stop-toggle").click(function(){
        togglePlayStop();
    });

    // changes global tempo
    $("#tempo-slider").on("mouseup", function () {
        console.log(this.value);
        set_tempo(this.value * -1);
    })

    // changes global musical key 
    $(document).on('change','#key-select',function(){
        console.log(this.value);
        set_key(this.value);
    });

    // stops click propegation when clicking in the tool tip
    $( ".shape-attr-popup" ).on( "mousedown", function( event ) {
        event.stopPropagation();
    });

    // changes instrument to the one selected from the dropdown
    $(document).on('change','.shape-attr-inst-select',function(){
        console.log($(this).attr("data"));
        var i = $(this).attr("data");
        console.log("changing to", this.value);
        shapesList[i].synth = synth_chooser(this.value);
    });

    // CLEAR - hide tooltips, stop transport, remove all shapes
    $("#clear").click(function(){
        hide_details();
        Tone.Transport.stop(0);
        for (var i = shapesList.length - 1; i >= 0; i--) {
            shapesList[i].delete();
        }
        r.clear();
        init_grid();
        if ($("#grid").is(":checked")) {
            show_grid();
        } 
        else {
            hide_grid();
        }
        shapesList = [];
        ACTIVE_SHAPE = new Shape(ROOT_NOTE, DEFAULT_SYNTH);
        hoverLine = r.path().attr(hoverLineAttr);
        hoverCircle = r.circle(0,0,3).attr(hoverCircleAttr);
        if (CURR_TOOL == "adjust") {
            hoverCircle.hide();
        }
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

            //console.log(prev_n);

            if (x < (origin_x + ORIGIN_RADIUS) && x > (origin_x - ORIGIN_RADIUS) && 
                y < (origin_y + ORIGIN_RADIUS) && y > (origin_y - ORIGIN_RADIUS)) {
                complete_shape();
            } else {        
                PREV_ENDPOINT = "M" + x + "," + y;
                var moveTo = "M" + x + "," + y;
                var lineTo = "L" + x + "," + y;

                hoverLine.attr("path", moveTo);                

                if (ACTIVE_SHAPE.path.attr("path") === "") { // shape is empty
                    ACTIVE_SHAPE.path.attr("path", moveTo);
                    //ACTIVE_SHAPE.animCircle.attr({"cx": x, "cy": y});
                    ACTIVE_SHAPE.animCircle.show();
                } else {
                //    if (x != prev_n[1] && y != prev_n[2]) { // double click check TODO
                        ACTIVE_SHAPE.path.attr("path", path_to_string(ACTIVE_SHAPE.path) + lineTo);
                //    }
                }
                //if (x != prev_n[1] && y != prev_n[2]) { // TODO
                    var newNode = new Node(x, y, ACTIVE_SHAPE.length(), shapesList.length);
                    ACTIVE_SHAPE.nodes.push(newNode);
                //}
            }
        }
    });

    $( "#holder" ).on( "dblclick", function( event ) {
        console.log(event);
        if (CURR_TOOL == "draw") {
            complete_shape();
        }
    });

});

/* -------------------------------------------------------------------------- */
/* -------------------------------- FUNCTIONS ------------------------------- */
/* -------------------------------------------------------------------------- */

/* completes the ACTIVE SHAPE: finishes the path by connecting the latest point
   to the origin. Adds the shape to shapesList. Initializes new shape 
*/
function complete_shape(){

    ACTIVE_SHAPE.path.attr("path", path_to_string(ACTIVE_SHAPE.path) + "Z");
    ACTIVE_SHAPE.path.attr(shapeFilledAttr);
    ACTIVE_SHAPE.path.data("i", shapesList.length);
    ACTIVE_SHAPE.init_shape_attr_popup();

    ACTIVE_SHAPE.set_note_values();

    shapesList.push(ACTIVE_SHAPE);

    ACTIVE_SHAPE = new Shape(ROOT_NOTE, DEFAULT_SYNTH);

    hoverLine.attr("path", "");
    PREV_ENDPOINT = "";
    
    console.log(shapesList);
}

function path_to_string(path){
    return path.attr("path").join()
}
function subpath_to_string(path, i){
    return path.attr("path")[i].join()
}


/* ---------------------------------- GRID ---------------------------------- */
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
    for (var i = shapesList.length - 1; i >= 0; i--) {
        shapesList[i].hide_handles();
    }
}

function show_handles () {
    for (var i = shapesList.length - 1; i >= 0; i--) {
        shapesList[i].show_handles();
    }
}

/* -------- TOOLS -------- */
function select_tool(tool) {
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

/* -------- TOOLTIP DETAILS -------- */
function delete_shape (i) {
    shapesList[i].delete();
 //   shapesList.splice(i, 1);
    $(".shape-attr-popup").hide();
    console.log(shapesList);
}

function update_start_freq(i){
    var freq = $("#start-freq-input").val();
    shapesList[i].set_start_freq(freq);
    shapesList[i].set_note_values();
}
function hide_details () {
    for (var i = shapesList.length - 1; i >= 0; i--) {
        shapesList[i].path.attr(shapeFilledAttr);
    }
    $(".shape-attr-popup").hide();
}

function delete_hoverin (i) {
    shapesList[i].path.attr(shapeWarningAttr);
    for (var j = shapesList[i].nodes.length - 1; j >= 0; j--) {
        shapesList[i].nodes[j].handle.attr(handlesWarningAttr)
    }
}

function delete_hoverout (i) {
    shapesList[i].path.attr(shapeSelectedAttr);
    for (var j = shapesList[i].nodes.length - 1; j >= 0; j--) {
        shapesList[i].nodes[j].handle.attr(handlesDefaultAttr)
    }
}

function lineDistance( point1, point2 )
{
    var xs = 0;
    var ys = 0;
    //console.log(point1);

    xs = point2.handle.attr("cx") - point1.handle.attr("cx");
    xs = xs * xs;

    ys = point2.handle.attr("cy") - point1.handle.attr("cy");
    ys = ys * ys;

    return Math.sqrt( xs + ys );
}





// length = 7
// 0 1 2 3 4 5 6
// A B C D E F G    - scale leters
//  2 2 1 2 2 2 1   - Intervals

function findSumUp (i, deg){
    //console.log("starting with:", SCALE_LETTERS[i]);
    //console.log("INCREASING:", deg);
    var sum = 0;
    
    while (deg > 0) {
        //console.log("i, at i", i, INTERVALS[i]);

        sum += INTERVALS[i];
        i++;
        if (i > INTERVALS.length - 1) {
            i = 0;
        }
        deg--;
    }

    return sum;
}

function findSumDown (i, deg){
    console.log("starting with:", SCALE_LETTERS[i]);
    console.log("DECREASING:", deg);    
    
    var sum = 0;
    
    if (i === 0) {
        i = INTERVALS.length;
    }

    i = i - 1;

    while (deg > 0) {
        console.log("i, at i", i, INTERVALS[i]);
        sum += INTERVALS[i];
        i--;
        if (i < 0) {
            i = INTERVALS.length - 1;
        }
        deg--;
    }
    return sum;
}

function increase_by_scale_degree (note, deg, neg_mult) {
    //console.log("================ INCREASE DEGREE ================")

    var noteVal = Tone.Frequency(note, "midi").toNote();
    

    
    var noteLetter = noteVal.charAt(0);
    var iInScale = SCALE_LETTERS.indexOf(noteLetter);

    var sum = 0;

    if (neg_mult === -1) {
        sum = findSumDown(iInScale, deg);
        sum = sum * -1;
    } else {
        sum = findSumUp(iInScale, deg);
    }

    //console.log("SUM", sum);
    
    var newMidiNote = note + sum;

    var newNote = Tone.Frequency(newMidiNote, "midi").toNote();
    newNote = Tone.Frequency(newNote).toNote();
    console.log("NEW NOTE", newNote);
    //console.log("NEW MIDI NOTE", newMidiNote);

    return newNote;
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
    var notesInScale = SCALE_LETTERS.length;
    var changeInScaleDegree = 0;
    var dTheta = 180 / notesInScale;
    var lowerBound = 0;
    var upperBound = dTheta;

    for (var i = notesInScale; i > 0; i--) {
        if(isBetween(absTheta, lowerBound, upperBound)) {
            /*console.log("THETA:", absTheta);
            console.log("IN THIS SECTOR:", i);
            console.log("IS NEGATIVE:", neg_mult);*/
            var newNote = increase_by_scale_degree(note, i, neg_mult);
            break;
        }
        lowerBound = upperBound;
        upperBound += dTheta;
    }
    return newNote;
}

function isBetween (val, a, b) {
    return (val > a && val <= b);
}

function increment_start_freq(dir, i){
    //console.log(this);
    var freq = shapesList[i].start_freq;
    var note = Tone.Frequency(freq).toMidi();

    console.log(freq);
    var new_freq;

    if (dir === 1) { //up;
        new_freq = increase_by_scale_degree (note, 1, 1)
    }  
    if (dir === 0) { //down
        new_freq = increase_by_scale_degree (note, 1, -1)
    }

    shapesList[i].set_start_freq(new_freq);
    shapesList[i].set_note_values();

    $("#start-freq-label-"+i).html(new_freq);
}

function change_instrument (i){
    shapesList[i].synth = synth_chooser(this.value);
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
        case "Pluck":
            synth = new Tone.PluckSynth();
            break;
        case "Poly":
            synth = new Tone.PolySynth();
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

function set_tempo(val) {
    TEMPO = val;
    reset_all_notes();
}

function set_key(key) {
    if (key === "major") {
        INTERVALS = MAJOR_INTERVALS;
    } else if (key === "minor"){
        INTERVALS = MINOR_INTERVALS;
    }
    reset_all_notes();
}

function reset_all_notes() {
    for (var i = shapesList.length - 1; i >= 0; i--) {
        shapesList[i].set_note_values();
    }
}

function get_this_synth (shape) {
    return shape.synth;
}
