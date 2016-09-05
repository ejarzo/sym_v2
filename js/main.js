/* ---------------- GLOBALS ---------------- */
var r = Raphael("holder", "100%", "100%");

var TEMPO = 3;
var ORIGIN_RADIUS = 15;
var ROOT_NOTE = "A";

/* ---------------- COLORS ---------------- */
var warningRed = "rgba(255,100,100,.5)";
var black = "rgba(30,30,30,1)";
var white = "rgba(255,255,255, .8)"

/* ---------------- ATTRIBUTES ---------------- */
/* shapes */
var shapeDefaultAttr = {"stroke": black, "stroke-width": "2"};
var shapeHoverAttr = {"stroke-width": 3};
var shapeFilledPreviewAttr = {"fill": "rgba(120,120,120,.1)", stroke: black, "stroke-width": 2};
var shapeFilledAttr = {"fill": "rgba(100,100,100,.2)", stroke: black, "stroke-width": 2};
var shapeWarningAttr = {"fill": warningRed, "stroke": warningRed};
var shapeSelectedAttr = {"fill": "rgba(0,0,0,.5)", stroke: black, "stroke-width": 3};

/* handles */
var handlesWarningAttr = {"opacity": 0.2};
var handlesDefaultAttr = {"opacity": 1};

/* ---------------- Raphael ---------------- */

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

/* ---------------- Shape class ------------------ */
class Shape {
    constructor(start_freq, id_num) {
        
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

                for (var j = currShape.handles.length - 1; j >= 0; j--) {
                    (currShape.handles[j]).circle.translate(dx - this.odx, dy - this.ody);
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
                console.log(e);
                var i = this.data("i");
                var currShape = shapesList[i];
                
                currShape.show_details(e);
            }
            this.odx = this.ody = 0;
            //hide_details();
            //console.log("up")
            //DRAG = false;
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
            for (var i = this.handles.length - 1; i >= 1; i--) {
                this.handles[i].hide();
            }
        }

        this.show_handles = function () {
            for (var i = this.handles.length - 1; i >= 0; i--) {
                this.handles[i].show();
            }
        }

        /* ----- Details ----- */
        this.show_details = function (event) {
            this.path.attr(shapeSelectedAttr);
            
            $("#details").empty();
            
            var hideButton = "<button class='hide-details' onclick='hide_details()'>X</button>"
            var x = event.clientX + 20;
            var y = event.clientY - 25;

            $("#details").css({left: x, top: y});

            var i = this.path.data("i");
            var deleteButton = "<button class='delete-shape' data='" + i + "' onclick='delete_shape(" + i + ")' onmouseover='delete_hoverin(" + i + ")' onmouseout='delete_hoverout(" + i + ")'>DELETE</button>"
            var start_freq = this.start_freq;
            $("#details").append(hideButton, deleteButton, start_freq);

            //this.path.attr({stroke: "#f00"});
            $("#details").show();
        }

        /* ----- Click ----- */
        this.click = function (item) {
            return function (event) {
                if (CURR_TOOL == "adjust" && DRAG == false) {
                    console.log(event);
                    event.stopPropagation();
                    item.show_details(event);
                    DRAG == true;
                }
            };
        };

        /* ----- Delete ----- */
        this.delete = function () {
            this.pause();
            this.path.remove();
            for (var i = this.handles.length - 1; i >= 0; i--) {
                this.handles[i].circle.remove();
            }
            this.included = false;
        }


        /* --------- path attributes --------- */
        this.path = r.path().attr(shapeDefaultAttr);
        this.path.hover(this.hoverIn(this), this.hoverOut(this));
        this.path.drag(this.move, this.start, this.up);
        //this.path.click(this.click(this));

        this.handles = [];

        this.start_freq = start_freq;
        this.completed = false;
        this.loop = false;
        this.length = function () {return (this.path.attr("path")).length};
        this.animCircle = r.circle(0, 0, 5).attr("fill", "#111");
        this.animCircle.attr("progress", 0);
        this.anim;
        this.included = true;
        this.dragging = false;
    }

    animate () {
        var length = this.path.getTotalLength() * TEMPO;
  
        this.animCircle.data("mypath", this.path);
        this.anim = Raphael.animation({progress: 1}, length).repeat(Infinity);
        this.animCircle.animate(this.anim);    
    }
    
    pause () {
        // TODO
        var origin_x = (this.path.attr("path")[0])[1];
        var origin_y = (this.path.attr("path")[0])[2];
        //console.log(origin_x, origin_y);
        
        this.animCircle.stop(this.anim);
        this.anim = "";
        this.animCircle.remove();

        this.animCircle = r.circle(0, 0, 5).attr("fill", "#111");
        this.animCircle.attr("progress", 0);
    }
}


/* ---------------- Vertex Handle class ------------------ */
class VertexHandle {
    constructor(x, y, i, shapeId) {
        //this.hidden = true;
        if ((i-1) == 0) {
            this.discattr = {fill: "#000", stroke: "#000", "stroke-width": 1, opacity: 1};
            this.isFirst = true;
        } else {
            this.discattr = {fill: "#eee", stroke: "#000", "stroke-width": 2, opacity: 0};
        }
        
        this.circle = r.circle(x,y,3).attr(this.discattr);
        
        this.circle.data("i", i);
        this.circle.data("shapeId", shapeId);
        
        this.circle.click(function(){
            console.log("index:", this.data("i"));
            console.log("shape id:", this.data("shapeId"));
        });
        
        this.circle.control_update = function (x, y) {
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

                this.translate(dx - (this.odx || 0), dy - (this.ody || 0));
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
            this.circle.attr("opacity", 0);
        }

        this.show = function () {
            this.circle.attr("opacity", 1);
        }

        this.circle.drag(this.move, this.up);
        this.circle.hover(this.hoverIn(this.circle), this.hoverOut(this.circle));
    }
}




var GRID_SIZE = 50;
var GLOBAL_MARGIN = 5;
// TOOLS: draw, adjust
var CURR_TOOL = "draw";
var PREV_ENDPOINT;
var ACTIVE_SHAPE = new Shape(ROOT_NOTE);
var lineToMouseIsActive = false;
var shapesList = [];
var lineToMouse = r.path().attr({"stroke": "#AAA", "stroke-width": "2"});
var circleAtMouseAttr = {fill: "#AAA", stroke: "#aaa"};

var circleAtMouse = r.circle(0,0,3).attr(circleAtMouseAttr);

var gridDots = r.set();
//var HOVER_OVER_ORIGIN = false;



$(document).ready(function() {
    
    /* ----------------------- HANDLERS ----------------------- */

    init_grid();
    hide_handles();

    // PLAY
    $("#play").click(function(){
        // TODO
        for (var i = shapesList.length - 1; i >= 0; i--) {
            if (shapesList[i].included) {
                shapesList[i].animate();
            }
        }
    });

    // STOP
    $("#stop").click(function(){
        // TODO
        for (var i = shapesList.length - 1; i >= 0; i--) {
            if (shapesList[i].included) {
                shapesList[i].pause();
            }        
        }
    });

    // COMPLETE SHAPE
    //$("#complete-shape").click(function(){
    //    complete_shape();
    //});

    // NEW SHAPE
    $("#new-shape").click(function(){
        /*if (ACTIVE_SHAPE.length()) {
            ACTIVE_SHAPE.completed = true;
            SHAPES.push(ACTIVE_SHAPE);
            new_shape();
        };*/
    });

    // CLEAR
    $("#clear").click(function(){
        hide_details();
        r.clear();
        init_grid();
        if ($("#grid").is(":checked")) {
            show_grid();
        } 
        else {
            hide_grid();
        }
        shapesList = [];
        ACTIVE_SHAPE = new Shape(ROOT_NOTE);
        lineToMouse = r.path().attr({"stroke": "#AAA", "stroke-width": "2"});
        circleAtMouse = r.circle(0,0,3).attr(circleAtMouseAttr);
        if (CURR_TOOL == "adjust") {
            circleAtMouse.hide();
        }
    });
    
    /* TOOLS */
    $("#draw-tool").click(function(){
        select_tool("draw");
        circleAtMouse.show();
        hide_handles();
    });

    $("#adjust-tool").click(function(){
        select_tool("adjust");
        circleAtMouse.hide();
        show_handles();
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
        //console.log(circleAtMouse);
        circleAtMouse.attr({cx: x, cy: y});
        //circleAtMouse.remove();
        //circleAtMouse = r.circle(x,y,3).attr(circleAtMouseAttr).toBack();

        if (lineToMouse.attr("path")) {
            lineToMouse.attr("path", subpath_to_string(lineToMouse, 0) + endpoint);
        }
    });
    $( "#details" ).on( "mousedown", function( event ) {
        event.stopPropagation();
    });
    $( "#holder" ).on( "mousedown", function( event ) {
        if ($("#details").is(":visible")) {
            hide_details();
        }
        
        if (CURR_TOOL == "draw") {
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
                complete_shape();
            } 

            else {        
                PREV_ENDPOINT = "M" + x + "," + y;
                var moveTo = "M" + x + "," + y;
                var lineTo = "L" + x + "," + y;

                lineToMouse.attr("path", moveTo);                

                if (ACTIVE_SHAPE.path.attr("path") === "") { // shape is empty
                    ACTIVE_SHAPE.path.attr("path", moveTo);
                } else {
                    ACTIVE_SHAPE.path.attr("path", path_to_string(ACTIVE_SHAPE.path) + lineTo);
                }

                var newVertexHandle = new VertexHandle(x, y, ACTIVE_SHAPE.length(), shapesList.length);
                
                ACTIVE_SHAPE.handles.push(newVertexHandle);
                //console.log(ACTIVE_SHAPE.handles);
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

/* ----------------------- FUNCTIONS ----------------------- */

function complete_shape(){

    ACTIVE_SHAPE.path.attr("path", path_to_string(ACTIVE_SHAPE.path) + "Z");
    ACTIVE_SHAPE.path.attr(shapeFilledAttr);
    ACTIVE_SHAPE.path.data("i", shapesList.length);

    shapesList.push(ACTIVE_SHAPE);

    ACTIVE_SHAPE = new Shape(ROOT_NOTE);

    lineToMouse.attr("path", "");
    lineToMouseIsActive = false;
    PREV_ENDPOINT = "";
    
    console.log(shapesList);
    //console.log(lineToMouse);
}

function path_to_string(path){
    //console.log(path);
    return path.attr("path").join()
}
function subpath_to_string(path, i){
    return path.attr("path")[i].join()
}

/* -------- GRID -------- */
function init_grid () {
    var canvas_width = $("#holder").width();
    var canvas_height = $("#holder").height();

    for (var x = GRID_SIZE; x < canvas_width; x += GRID_SIZE) {
        for (var y = GRID_SIZE; y < canvas_height; y += GRID_SIZE) {
            var gridDot = r.circle(x ,y, 2).toBack();
            gridDot.attr({"fill": "#777", "stroke-width": 1, "stroke": "#FFF"});
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
    CURR_TOOL = tool;
    hide_details();
    $( ".tool" ).removeClass("active");
    
    var toolName = "#" + tool + "-tool";
    $( toolName ).addClass("active");
}

/* -------- DETAILS -------- */
function delete_shape (i) {
    shapesList[i].delete();
 //   shapesList.splice(i, 1);
    $("#details").hide();
    console.log(shapesList);
}
function hide_details () {
    for (var i = shapesList.length - 1; i >= 0; i--) {
        shapesList[i].path.attr(shapeFilledAttr);
    }
    $("#details").hide();
}

function delete_hoverin (i) {
    shapesList[i].path.attr(shapeWarningAttr);
    for (var j = shapesList[i].handles.length - 1; j >= 0; j--) {
        shapesList[i].handles[j].circle.attr(handlesWarningAttr)
    }
}

function delete_hoverout (i) {
    shapesList[i].path.attr(shapeSelectedAttr);
    for (var j = shapesList[i].handles.length - 1; j >= 0; j--) {
        shapesList[i].handles[j].circle.attr(handlesDefaultAttr)
    }
}
