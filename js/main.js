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


var TEMPO = 2;

/* Shape class */
class Shape {
    constructor(start_freq, id_num) {
        this.nodes = [];
        
        this.hoverIn = function (item) {
            return function (event) {
                if (CURR_TOOL == "adjust") {
                    item.path.attr("stroke-width", "3");
                    var id = item.path.id;
                    console.log(id);
                }
            };
        };

        this.hoverOut = function (item) {
            return function (event) {
                item.path.attr("stroke-width", "2");
            };
        };

        this.path = r.path().attr({"stroke": "#111", "stroke-width": "2"}).hover(this.hoverIn(this), this.hoverOut(this));
        //this.bBox = this.path.getBBox();
       

        this.origin = "";
        this.start_freq = start_freq;
        this.completed = false;
        this.loop = false;
        this.circ1 = r.circle(0, 0, 5).attr("fill", "#111");
        this.circ1.attr("progress", 0);
        this.anim;
    }
    animate () {
        var length = this.path.getTotalLength() * TEMPO;
        //console.log(length);
        
        //var anim = Raphael.animation({guide : this.path, along : 0}, length).repeat(Infinity);
        this.animate_helper(length);
        //var data = [this.path, 1];
        //console.log(data);
        /*this.circ1.data("mypath", this.path);
        var anim = Raphael.animation({progress: 1}, length).repeat(Infinity);
        this.circ1.animate(anim);*/

        //this.circ1.animate(anim);
        //this.circ1.attr({guide : this.path, along : 0}).animate({along : 1}, length, "linear");
        //setInterval(this.animate_helper,length);
    }
    animate_helper(length){
        this.circ1.data("mypath", this.path);
        this.anim = Raphael.animation({progress: 1}, length).repeat(Infinity);
        this.circ1.animate(this.anim);    }
    pause () {
        console.log("pause");
        this.circ1.pause(this.animation);
    }
}

var GRID_SIZE = 50;
var GLOBAL_MARGIN = 5;
/* 
    draw
    adjust 
*/
var CURR_TOOL = "draw";
var PREV_ENDPOINT;
var ACTIVE_SHAPE = new Shape;
var lineToMouseIsActive = false;
var shapesList = [];
var lineToMouse = r.path().attr({"stroke": "#AAA", "stroke-width": "2"});
var gridDots = [];
//var HOVER_OVER_ORIGIN = false;



$(document).ready(function() {
    
    /* ----------------------- HANDLERS ----------------------- */

    init_grid();

    // PLAY
    $("#play").click(function(){
        // TODO
        for (var i = shapesList.length - 1; i >= 0; i--) {
            shapesList[i].animate();
        }
    });

    // STOP
    $("#stop").click(function(){
        // TODO
        for (var i = shapesList.length - 1; i >= 0; i--) {
            shapesList[i].pause();
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
        //stop_all();
        //r.clear();
        for (var i = shapesList.length - 1; i >= 0; i--) {
            shapesList[i].path.hide()
        }
        shapesList = [];
        ACTIVE_SHAPE = new Shape();
        lineToMouse = r.path().attr({"stroke": "#AAA", "stroke-width": "2"});
    });


    $("#draw-tool").click(function(){
        CURR_TOOL = "draw";
    });

    $("#adjust-tool").click(function(){
        CURR_TOOL = "adjust";
    });
    /*
    $( "#complete-shape" ).on( "click", function( event ) {
        complete_shape();
    });*/
    
    // TOGGLE GRID
    $("#grid").click(function(){
        if ($("#grid").is(":checked")) {
            show_grid();
        } 
        else {
            hide_grid();
        }
    });




    $( "#holder" ).on( "mousemove", function( event ) {
        if(CURR_TOOL == "draw"){
            $( "#holder" ).css("cursor", "crosshair");
            $( "#draw-tool" ).css("background", "#AAA");
            $( "#adjust-tool" ).css("background", "#fff");

        }
        if(CURR_TOOL == "adjust"){
            $( "#holder" ).css("cursor", "default");
            $( "#draw-tool" ).css("background", "#fff");
            $( "#adjust-tool" ).css("background", "#aaa");
        }

        var x = event.pageX - GLOBAL_MARGIN;
        var y = event.pageY - GLOBAL_MARGIN;

        if ($("#snap").is(":checked")) {
            x = (Math.round(x / GRID_SIZE) * GRID_SIZE);
            y = (Math.round(y / GRID_SIZE) * GRID_SIZE);
        };

        //console.log(ACTIVE_SHAPE.path.attr("path")[0][1]);
        if ((ACTIVE_SHAPE.path.attr("path")).length) {
            var origin_x = ACTIVE_SHAPE.path.attr("path")[0][1];
            var origin_y = ACTIVE_SHAPE.path.attr("path")[0][2];
            //console.log(origin_x);
            //console.log(origin_y);
        }

        if (x < (origin_x + 20) && x > (origin_x - 20) && 
                y < (origin_y + 20) && y > (origin_y - 20)) {
            x = origin_x;
            y = origin_y;
            ACTIVE_SHAPE.path.attr("fill", "rgba(120,120,120,.1)");
            //HOVER_OVER_ORIGIN = true;
        } 
        else {
            ACTIVE_SHAPE.path.attr("fill", "");
        }
            


        var endpoint = "L" + x + "," + y;
        

        if (lineToMouse.attr("path")) {
            lineToMouse.attr("path", subpath_to_string(lineToMouse, 0) + endpoint);
        }
    });

    $( "#holder" ).on( "click", function( event ) {
        if (CURR_TOOL == "draw") {
            var x = event.pageX - GLOBAL_MARGIN;
            var y = event.pageY - GLOBAL_MARGIN;
            
            if ($("#snap").is(":checked")) {
                x = (Math.round(x / GRID_SIZE) * GRID_SIZE);
                y = (Math.round(y / GRID_SIZE) * GRID_SIZE);
            };

            if ((ACTIVE_SHAPE.path.attr("path")).length) {
                var origin_x = ACTIVE_SHAPE.path.attr("path")[0][1];
                var origin_y = ACTIVE_SHAPE.path.attr("path")[0][2];
            }

            if (x < (origin_x + 20) && x > (origin_x - 20) && 
                    y < (origin_y + 20) && (y > origin_y) - 20) {
                complete_shape();
            } 
            else {        
                PREV_ENDPOINT = "M" + x + "," + y;
                var moveTo = "M" + x + "," + y;
                var lineTo = "L" + x + "," + y;

                lineToMouse.attr("path", moveTo);                

                if (ACTIVE_SHAPE.path.attr("path") === "") {
                    ACTIVE_SHAPE.path.attr("path", moveTo);
                } else {
                    ACTIVE_SHAPE.path.attr("path", path_to_string(ACTIVE_SHAPE.path) + lineTo);
                }

            }
            /*console.log("lineToMouse:");
            console.log(lineToMouse);*/
        }
    });

    $( "#holder" ).on( "dblclick", function( event ) {
        if (CURR_TOOL == "draw") {
            complete_shape();
        }
    });

});

/* ----------------------- FUNCTIONS ----------------------- */

function complete_shape(){

    ACTIVE_SHAPE.path.attr("path", path_to_string(ACTIVE_SHAPE.path) + "Z");
    ACTIVE_SHAPE.path.attr("fill", "rgba(50,50,50,.1)");

    shapesList.push(ACTIVE_SHAPE);

    ACTIVE_SHAPE = new Shape;

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


function init_grid () {
    var canvas_width = $("#holder").width();
    var canvas_height = $("#holder").height();


    for (var x = GRID_SIZE; x < canvas_width; x += GRID_SIZE) {
        for (var y = GRID_SIZE; y < canvas_height; y += GRID_SIZE) {
            var gridDot = r.circle(x ,y, 2);
            gridDot.attr({"fill": "#777", "stroke-width": 1, "stroke": "#FFF"});
            gridDots.push(gridDot);
            hide_grid();
        }
    }
    
}

function hide_grid () {
    for (var i = gridDots.length - 1; i >= 0; i--) {
        gridDots[i].hide();
    }
}

function show_grid () {
    for (var i = gridDots.length - 1; i >= 0; i--) {
        gridDots[i].show();
    }
}
