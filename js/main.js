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

/* --------------------------------- COLORS --------------------------------- */
var colorsList = ["#c9563c", "#f4b549", "#2a548e", "#705498", "#33936b"];
var NUM_COLORS = 5;
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
var handlesWarningAttr = {opacity: 0.2};
var handlesDefaultAttr = {r: 3, "stroke-width": 2};
var handleHoverInAttr = {r: 6, "stroke-width": 3};

/* hover hint */
var hoverCircleAttr   = {"fill": "#ddd", "fill-opacity": .4, "stroke": "#ddd", "stroke-width": 2};
var hoverLineAttr     = {"stroke-width": "2", opacity: 0.5};

/* grid */
var gridDotAttr       = {fill: "#777", "stroke-width": 1, stroke: "#FFF"};


/* --------------------------------- GLOBALS -------------------------------- */

/* ======== AUDIO ===================================================== */
/* "interactive", "playback", "balanced", "fastest"*/
Tone.Transport.latencyHint = 'interactive';

var PLAYING = false;
var synthsList =  ["colton_08", "Marimba", "colton_12", "Duo", "Keys", "Sub Bass", 
                   "Simple", "AM", "Super Saw", "Membrane", "Kalimba", "Cello", "Pizz"];

var DEFAULT_SYNTH = synthsList[0];
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
var CURR_TOOL = "draw"; // draw, adjust
var CURR_DRAW_STATE = "ready"; // ready, drawing

/* ======== LINE TO MOUSE ============================================== */
var ORIGIN_RADIUS = 15;
var hoverLine = r.path().attr(hoverLineAttr);
var hoverCircle = r.circle(0,0,3).attr(hoverCircleAttr);

/* ======== RECORDING =====================----========================= */
//var masterLimiter = new Tone.Limiter(-60);
var rec = new Recorder(Tone.Master);
var RECORD_ARMED = false;
var RECORDING = false;

/* ========================================================================== */
/* ========================================================================== */
/* -------------------------------- CLASSES --------------------------------- */
/* ========================================================================== */
/* ========================================================================== */


/* ========================================================================== */
/* ------------------------------ Project class ----------------------------- */
class Project {
    constructor (/*proj_obj*/) {
        this.name = "New Project";
        this.tempo = DEFAULT_TEMPO;
        this.scaleObj = teoria.note(DEFAULT_KEY).scale(DEFAULT_SCALE);
        this.rootNote = this.scaleObj.tonic.toString();
        this.shapesList = [];
        this.instColors = [];
        this.quantizeLength = 700;

        /* Init */
        this.init_tempo();
        this.init_scale_select();
        this.init_tonic_select();
        this.init_inst_colors();
        this.init_color_picker();
    }
    /* ---------- SETTERS ---------- */
    set_tempo (tempo) {
        this.tempo = tempo;
        this.reset_all_notes();
    }
    set_scale (name) {
        //console.log("SETTING SCALE TO:", name);
        this.scaleObj = teoria.note(this.rootNote).scale(name);
        //console.log(this.scaleObj.simple());
        this.shapesList.forEach(function (shape) {
            if (shape.included) {
                shape.update_start_freq();
            }
        });

        this.reset_all_notes();
    }
    set_tonic (name) {
        //console.log("set tonic:", name);
        var note = teoria.note(name);
        var currScaleName = this.scaleObj.name;
        this.scaleObj = note.scale(currScaleName);
        this.rootNote = note.toString();
        //console.log("new scale:", this.scaleObj.simple())
        this.shapesList.forEach(function (shape) {
            if (shape.included) {
                shape.update_start_freq();
            }
        });
        this.reset_all_notes();
    }

    /* ---------- ACTIONS ---------- */

    init_tempo () {
        $(".tempo-slider").val(this.tempo * -1);
    }

    init_scale_select () {
        populate_list(keysList, this.scaleObj.name, ".scale-select");
    }

    init_tonic_select () {
        populate_list(tonicsList, this.scaleObj.tonic.toString(true), ".tonic-select");
    }

    init_inst_colors () {
        for (var i = 0; i < NUM_COLORS; i++) {
            var instColor = new InstColor(i, synthsList[i], colorsList[i]);
            this.instColors.push(instColor);
        }
        console.log(this.instColors);
    }
    
    init_color_picker(){
        var colorPicker = $(".color-palette .dropdown-content .palette-background");
        var colorPickerHtml = "";
        for (var i = 0; i < this.instColors.length; i++) {
            colorPicker.append('<div class="palette-color inst-color'+i+'" onclick="set_draw_inst_color('+i+')"></div>');
            $(".palette-color.inst-color"+i).css("background", this.instColors[i].color);
        }
    }
    
    clear_canvas () {
        hide_details();
        stop_handler();
        this.shapesList.forEach(function (shape) {
            if (shape.included) {
                shape.unmute();
                shape.delete();    
            }
        });
        $(".shape-attr-popup").remove();
        //$(".shape-attr-popup").show();

        r.clear();
        init_grid();
        
        if ($("#grid").is(":checked")) {show_grid();} 
        else {hide_grid();}
        
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

    reset_all_notes () {
        this.shapesList.forEach(function (shape) {
            if (shape.included) {
                shape.update_note_values();
            }
        });
    }

    /* ---------- I/O ---------- */

    dump () {
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
                    //synthName: currShape.synthName,
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

    load (proj_obj) {
        console.log("Loading Project:", proj_obj);

        this.clear_canvas();
        this.tempo = proj_obj.tempo;
        this.set_tempo(this.tempo);
        this.scaleObj = teoria.note(proj_obj.tonic).scale(proj_obj.scaleName);
        this.rootNote = this.scaleObj.tonic.toString();

        for (var i = 0; i < proj_obj.shapesList.length; i++) {
            var newShape = new Shape (i, 0, proj_obj.shapesList[i]);
            newShape.update_note_values();
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
                //parent.animCircle.transform();

            }
        },
        this.move = function (dx, dy) {
            if (CURR_TOOL == "adjust") {
                dx = snap_to_grid(dx);
                dy = snap_to_grid(dy);
                //console.log(dx, dy);
                for (var i = parent.nodes.length - 1; i >= 0; i--) {
                    var nodeX = parent.nodes[i].getX();
                    var nodeY = parent.nodes[i].getY();
                    var newX = nodeX + (dx - this.odx);
                    var newY = nodeY + (dy - this.ody);  
                    /*var animCircleX = parent.animCircle.attr("cx");
                    var animCircleY = parent.animCircle.attr("cy");
                    var newAnimX = animCircleX + (dx - this.odx);
                    var newAnimY = animCircleY + (dy - this.ody);*/
                    //var transform = this.animCircle.matrix.split();
                    //console.log(transform);
                    //parent.nodes[i].handle.translate(dx - this.odx, dy - this.ody);
                    parent.nodes[i].handle.attr({"cx": newX, "cy": newY});
                    //parent.animCircle.transform("t"+dx+","+dy);
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

                var center = parent.get_center_point();
                parent.update_pan(center.x);
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
            //parent.animCircle.transform("t0,0");
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

        /* ----- Details ----- */
        this.show_attr_popup = function (event) {
            console.log("PERIMTER:", this.getPerim());
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

            this.included = false;
        }
        
        /* ----- Mute ----- */
        this.mute = function () {
            console.log("mute");
            this.synth.triggerRelease();
            this.isMuted = true;
            //this.synth.volume.value = "-inf";
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
                if (shape.id != parent.id && shape.included && !shape.isMuted) {
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
                if (shape.i != parent.id && shape.included) {
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
        this.pan = 0;        
        this.volume = -8;        
        this.panner = new Tone.Panner(this.pan).toMaster();
        this.limiter = new Tone.Limiter(-12).toMaster();

        this.isMuted = false;
        this.isMutedFromSolo = false;
        this.isSoloed = false;

        this.quantizeMult = 1;

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
        this.included = true;

        // animation
        this.animCircle = r.circle(0, 0, 5).attr(this.animCircleAttr).toFront().hide();

        /* ============== load from saved shape ============== */
        if (savedData) {
            var pathList = savedData.pathList;

            this.isCompleted = true;
            this.startFreqIndex = savedData.startFreqIndex;
            //console.log("LOADING SYNTH:", savedData.synthName);

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

            this.update_pan(this.get_center_point().x);
            
            pathString += "Z";
            this.path.attr("path", pathString);
            this.id = id;
            this.path.attr(shapeFilledAttr);
        }
        
        this.popup = $("<div>", {"id": "shape-attr-popup-"+this.id, "class": "shape-attr-popup"}).html(this.get_popup_content());
        $("body").append(this.popup);

        //this.freeverb = new Tone.Freeverb(.9).toMaster();
        this.synth = synth_chooser(this.get_inst_color().name);
        //this.synth = presetXX;
        this.update_start_freq();
        

        /* ============================================================= */
        /* ======================= PART CALLBACK ======================= */
        /* ============================================================= */
        this.part = new Tone.Part(function (time, value) {
            if (parent.isCompleted) {
                //var parent = value.parent;
                //var thisSynth = get_this_synth(parent);
                var thisSynth = parent.synth.connect(parent.panner);
                //console.log("VALUE", value);
                
                if (parent.isMuted) {
                    thisSynth.volume.value = -60;
                } else {
                    thisSynth.volume.value = parent.volume;
                }

                //parent.animCircle.transform("t0,0");
                parent.animCircle.show().toFront();
                
                var duration = value.dur;
                var lengthToMiliseconds = (value.noteDur * 1000).toFixed(9);
                //var duration = (lengthToMiliseconds / 1000).toFixed(12);
                var note = value.noteVal;
                console.log("note:", note);
                //console.log("DUR:", duration)
                //console.log("TO MIL:", lengthToMiliseconds)

                Tone.Draw.schedule(function () {
                    var startX = value.nodeFrom.getX();
                    var startY = value.nodeFrom.getY();
                    var endX = value.nodeTo.getX();
                    var endY = value.nodeTo.getY();

                    parent.animCircle.attr({cx : startX, cy : startY})
                    parent.animCircle.animate({"cx": endX, "cy": endY}, lengthToMiliseconds, function () {
                        //console.log("X,Y:", this.attr("cx"), this.attr("cy"));
                    });
                    //var parentColor = PROJECT.instColors[parent.instColorId].color;
                    var parentColor = parent.get_inst_color().color;

                    parent.animCircle.animate(animCircleBangStartAttr, 0, "linear", function () {
                        this.animate({"fill": parentColor, r: 3, stroke: parentColor}, 800, "ease-out");
                    });
                    parent.path.animate(animCircleBangStartAttr, 0, "linear", function () {
                        this.animate({"fill": parentColor}, 800, "ease-out");
                    });
                }, time)

                thisSynth.triggerAttackRelease(note, duration, time);
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
            parent.set_perim_length(PROJECT.quantizeLength * parent.quantizeMult);
        });
    }

    /* ---- SETTERS ---- */
    complete () {
        this.path.attr("path", path_to_string(this.path) + "Z");
        this.path.attr({"fill-opacity": completedShapeOpacity});
        
        var center = this.get_center_point();
        this.startFreqIndex = y_coord_to_index(center.y);
        this.update_start_freq();

        this.update_note_values();
        this.update_pan(center.x);
        
        if (PROJECT.isAutoQuantized) {
            this.set_perim_length(PROJECT.quantizeLength);
        }
        this.isCompleted = true;
        
        this.refresh_shape_attr_popup();
    }

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

        //populate_list(synthsList, this.get_inst_color().name, "#shape-attr-popup-"+this.id+" .shape-attr-inst-select");
    }

    set_instrument (name) {
        console.log("setting instrument to:", name);
        this.synth.triggerRelease();
        //this.synthName = name;
        this.synth.dispose();
        this.synth = synth_chooser(name);
        this.refresh_shape_attr_popup();
    }
    
    set_quantize_length (val) {
        var newPerim = val * this.getPerim();
        console.log("NEW PERIM:", newPerim);
        if (PROJECT.isAutoQuantized) {
            this.quantizeMult *= val;
            newPerim = PROJECT.quantizeLength * this.quantizeMult;
        }
        this.set_perim_length(newPerim);
    }

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

    /* --- Updaters --- */

    update_start_freq () {
        //console.log("update start freq");
        var startFreq = Tone.Frequency(PROJECT.rootNote).toMidi();
        //console.log("params:", startFreq, this.startFreqIndex);
        var newStartFreq = transpose_by_scale_degree(startFreq, this.startFreqIndex);
        this.startFreq = newStartFreq;
        //console.log(this.startFreq);
        this.refresh_shape_attr_popup();
    }
    
    get_center_point () {
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
    update_pan (val) {
        //console.log(xMean);
        this.panner.pan.value = val * 0.7;
    }
    
    update_note_values() {
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
        
        if (PROJECT.isAutoQuantized) {
            var totalLength = PROJECT.quantizeLength * this.quantizeMult * PROJECT.tempo / 1000;
        } else {
            var totalLength = delay + lastNoteInfo.noteDur;
        }
        console.log("TOTAL LENGTH:", totalLength, PROJECT.tempo);
        this.part.loopEnd = totalLength;
    }

    /* --- Getters ---*/
    get_origin() {
        var ox = this.path.attr("path")[0][1];
        var oy = this.path.attr("path")[0][2];
        return {
            x: ox,
            y: oy
        }
    }
    /* --- Transport --- */

    stop () {
        this.synth.triggerRelease();
        this.animCircle.hide();
        //this.synth.volume.value = -60;
    }

    /* --- Shape Attr Popup --- */
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
                <!--<label>Instrument:</label>-->\
                <div class="color-palette dropdown" style="background: '+this.get_inst_color().color+'">\
                        <!--<i class="ion-chevron-down"></i>-->\
                        <div class="dropdown-content">\
                            <div class="palette-background">'+colorPickerHtml+'</div>\
                        </div>\
                    </div>\
                <span>Shape: '+this.id+'</span>\
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
                <button class="shape-attr-set-perim">Quantize</button>\
                <button class="shape-attr-double">*2</button>\
                <button class="shape-attr-half">/2</button>\
                <span class="quantizemult-label">'+this.quantizeMult+'</span>\
            </div>\
            <div class="section">\
                <button class="shape-attr-tofront">To Front</button>\
                <button class="shape-attr-toback">To Back</button>\
            </div>\
            <div class="section">\
                <button class="shape-attr-delete-shape">Delete Shape</button>\
            </div>';

        return popupHtml;
    }

    refresh_shape_attr_popup () {
        console.log("REFRESH POPUP");
        this.popup.find(".start-freq-label").html(this.startFreq);
        this.popup.find(".quantizemult-label").html(this.quantizeMult);
        this.popup.find(".color-palette").css({"background": this.get_inst_color().color});
    }
    

    /* --- Helper ---*/

    /* returns an object containing note information - for the note from nodePrev to node.
    nodePrevPrev needed to calculate angle at node Prev
    */
    get_note_info (node, nodePrev, nodePrevPrev) {
        var noteVal;
        var duration = (line_distance(node, nodePrev) * PROJECT.tempo) / 1000;
        var isFirst = false;
        
        if (!nodePrevPrev) {
            isFirst = true;
            noteVal = this.startFreq;
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
    
    print_shape_info () {
        console.log("=== Printing shape info ===");
        this.nodes.forEach(function (node) {
            console.log(i);
            console.log("noteval", node.noteVal);
            console.log("duration", node.duration);
        });
    }  
}

/* ========================================================================== */
/* --------------------------- Vertex Handle class -------------------------- */
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
        this.handle = r.circle(x,y,3).attr(this.discattr).hide();
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
                var parentShape = PROJECT.shapesList[shapeId];
                // TODO ?
                if (PROJECT.isAutoQuantized) {
                    parentShape.set_perim_length(PROJECT.quantizeLength * parentShape.quantizeMult);
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
        this.getX = function () {
            var transform = this.handle.matrix.split();
            return this.handle.attr("cx") + transform.dx;
        }
        
        this.getY = function () {
            var transform = this.handle.matrix.split();
            return this.handle.attr("cy") + transform.dy;
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
class InstColor {
    constructor (i, instName, color) {
        var parent = this;
        this.id = i;
        this.name = synthsList[i];
        this.color = colorsList[i];
        var className = "inst-"+i;
        var selectedHtml = "";

        if (this.id === SELECTED_INSTCOLOR_ID) {
            selectedHtml = "selected-inst";
        }
        
        var instOptionHtml = '\
            <li class="'+selectedHtml+' inst-option '+className+'" data="'+this.name+'">\
                <div class="inst-title">\
                    <select class="inst-select">\
                        <option>Instrument</option>\
                    </select>\
                    <i class="ion-arrow-left-b"></i>\
                    <ul class="inst-params">\
                <li>\
                    <span class="inst-param-title">Glide</span><br>\
                    <input type="text" class="kk-knob kk-param-1"/>\
                </li>\
                <li>\
                    <span class="inst-param-title">Attack</span><br>\
                    <input type="text" class="kk-knob kk-param-2"/>\
                </li>\
                <li>\
                    <span class="inst-param-title">Decay</span><br>\
                    <input type="text" class="kk-knob kk-param-3"/>\
                </li>\
                <li>\
                    <span class="inst-param-title">Sustain</span><br>\
                    <input type="text" class="kk-knob kk-param-4"/>\
                </li>\
            </ul>\
                </div>\
            </li>';

        $(".inst-selectors ul.inst-list").append(instOptionHtml);
        this.li = $("."+className);
        
        populate_list(synthsList, this.name, ".inst-"+i+" .inst-title select");
        this.li.find(".inst-title").css({"background-color": this.color, "color": "#fff"});
        this.li.css({"background-color": hex_to_Rgba(this.color, 0.7), "border-color": this.color});
        
        this.li.on("click", function () {
            //set_draw_inst_color(parent.id);
        })

        this.li.find(".inst-select").on("change", function () {
            var val = $(this).val();
            parent.name = val;
            console.log(val)
            PROJECT.shapesList.forEach(function (shape) {
                console.log(val);
                if (shape.included && shape.get_inst_color().id == parent.id) {
                    console.log("found");
                    shape.set_instrument(val);
                }
            });
        })
    }
}


/* ========================================================================== */
/* ========================================================================== */
/* ----------------------------- DOCUMENT READY ----------------------------- */
/* ========================================================================== */
/* ========================================================================== */

var PROJECT = new Project;
var ACTIVE_SHAPE /*= new Shape(PROJECT.shapesList.length, SELECTED_INSTCOLOR_ID)*/;

$(document).ready(function () {

    init_grid();
    hide_handles();
    set_draw_inst_color(0);

    hide_menu();
    alert("Welcome to Shape Your Music. This application is currently under development, and you may experience bugs. If you have questions feel free to contact me at ejarz25@gmail.com. - Elias");
    //hide_info_pane();



/*    $(".kk-knob").khantrolKnob({
        css: "skeleton",
    })

    $(".kk-param-1").change(function () {
        var val = $(this).val()/300;
        console.log(val);
        for (var i = PROJECT.shapesList.length - 1; i >= 0; i--) {
            //if (PROJECT.shapesList[i].get_inst_color().name == "Simple"){
                PROJECT.shapesList[i].synth.portamento = val;
                
            //}
        }
    });
    $(".kk-param-2").change(function () {
        var val = $(this).val()/100;
        for (var i = PROJECT.shapesList.length - 1; i >= 0; i--) {
            //if (PROJECT.shapesList[i].get_inst_color().name == "Simple"){
                PROJECT.shapesList[i].synth.envelope.attack = val+0.005;
            //}
        }
    });
    $(".kk-param-3").change(function () {
        var val = $(this).val()/100;
        console.log(val);
        for (var i = PROJECT.shapesList.length - 1; i >= 0; i--) {
            //if (PROJECT.shapesList[i].get_inst_color().name == "Simple"){
                console.log(PROJECT.shapesList[i].synth.envelope);
                PROJECT.shapesList[i].synth.envelope.decay = val+0.005;
            //}
        }
    });
    $(".kk-param-4").change(function () {
        var val = $(this).val()/100;
        console.log(val);
        for (var i = PROJECT.shapesList.length - 1; i >= 0; i--) {
            //if (PROJECT.shapesList[i].instColorObj.name == "Simple"){
                console.log(PROJECT.shapesList[i].synth.envelope);
                PROJECT.shapesList[i].synth.envelope.sustain = val;
            //}
        }
    });*/
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
            if (shape.included) {
                shape.set_perim_length(PROJECT.quantizeLength * shape.quantizeMult);
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
                //PREV_ENDPOINT = "";
            }
            /* If not, add to current path */ 
            else if ((x != prev_n[1] || y != prev_n[2])){    
                //PREV_ENDPOINT = "M" + x + "," + y;
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
        Tone.Master.mute = false;
        Tone.Transport.start("+0.1");
    }
}

function stop_handler () {
    $(".play-stop-toggle").html("<i class='ion-play'></i>");
    PLAYING = false;
    PROJECT.shapesList.forEach(function (shape) {
        if (shape.included) {
            shape.stop();
        }                
    });
    Tone.Transport.stop(0);
    Tone.Master.mute = true;
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
        //hf.download = "Download:" + new Date().toISOString() + '.wav';
        
        hf.download = PROJECT.name + '.wav';
        hf.innerHTML = hf.download;
        li.appendChild(au);
        li.appendChild(hf);
        $(".controls").append(li);
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
}
/*$(window).resize(function () {
    init_grid();
    if ($("#grid").is(":checked")) {show_grid();} 
    else {hide_grid();}
});*/
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
        if ($("#grid").is(":checked")) {show_grid();} 
        else {hide_grid();}
    }, 500, "some unique string");
});

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
        if (shape.included) {
            shape.hide_handles();
        }
    });
}

function show_handles () {
    PROJECT.shapesList.forEach(function (shape) {
        if (shape.included) {
            shape.show_handles();
        }
    });
}

function hide_details () {
    SELECTED_SHAPE_ID = -1;
    PROJECT.shapesList.forEach(function (shape) {
        if (shape.included) {
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

function populate_list (values, selectedItem, className) {
    //console.log("SELECTED ITEM", selectedItem);
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

function synth_chooser (name) {
    var synth = new Tone.AMSynth();

    switch(name) {
        case "AM":
            synth = new Tone.AMSynth();
            break;
        case "Keys":
            synth = new Tone.Synth({
                "oscillator": {
                    "detune": 0,
                    "type": "custom",
                    "partials" : [2, 1, 2, 2],
                    "phase": 0,
                    "volume": 0
                },
                "envelope": {
                    "attack": 0.005,
                    "decay": 0.3,
                    "sustain": 0.2,
                    "release": 1,
                },
                "portamento": 0.01,
                "volume": -20});
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
        case "SubBass":
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
        case "SuperSaw":
            synth =  new Tone.Synth(
                   {
                    vibratoAmount:1,
                    vibratoRate:5,
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
            var tremolo = new Tone.Tremolo({
                "frequency" : 8,
                "type" : "sine",
                "depth" : 2,
                "spread" : 180
            }).toMaster().start();
            synth.connect(tremolo);
            break;
        case "Simple":
            synth = new Tone.Synth();
            break;
        case "Membrane":
            synth = new Tone.MembraneSynth();
            break;
        case "Kalimba":
            synth = new Tone.FMSynth({
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
                });
            break;
        case "Cello":
            synth = new Tone.FMSynth({
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
            });
            break;
        case "Pizz":
            synth = new Tone.MonoSynth({
                 "oscillator": {
                    "type": "sawtooth"
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
            });
            break;
        case "colton_12":
            synth = new Tone.MembraneSynth({
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
                }
            })
            var cheby = new Tone.Chebyshev({
                "order" : 50
            }).toMaster();
            synth.chain(cheby)
            break;
        case "colton_08":
            synth = new Tone.DuoSynth({
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
                    }
                });

            var chorus = new Tone.Chorus({
                frequency : 1,
                delayTime : 2,
                depth : 20,
                feedback : 0.1,
                type : "square",
                spread : 80
            }).toMaster();
            synth.chain(chorus)
            break;
        default:
    }
    return synth.toMaster();
}


/* ========================================================================== */
/* -------------------------------- HELPER  --------------------------------- */
/* ========================================================================== */

function line_distance (point1, point2) {
    var xs = 0;
    var ys = 0;
    xs = point2.getX() - point1.getX();
    xs = xs * xs;
    ys = point2.getY() - point1.getY();
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
            hide_menu()
        } else {
            show_menu()
        }
    }
    if (target === "inst-selectors") {
        if ($(".inst-selectors").css("height") == "20px") {
            expand_inst_selectors()
        } else {
            reduce_inst_selectors()
        }
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

function expand_inst_selectors () {
    $(".inst-selectors").animate({"height":'92px'}, 200);
    $(".show-hide-inst").html('<i class="ion-chevron-up"></i>');
}

function reduce_inst_selectors () {
    $(".inst-selectors").animate({"height":'20px'}, 200);
    $(".show-hide-inst").html('<i class="ion-chevron-down"></i>');
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
    init_grid();

    if ($("#grid").is(":checked")) {show_grid();} 
    else {hide_grid();}
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
