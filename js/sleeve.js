/*
Copyright (c) 2013 dissimulate at Codepen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// settings

//CONSTANTS
var physics_accuracy  = 20,
    mouse_influence   = 20,
    mouse_cut         = 0,
    gravity           = 300,
    cloth_height      = 35,
    cloth_width       = 10,
    start_y           = 20,
    start_x           = undefined,
    spacing           = 15,
    tear_distance     = 150;

window.requestAnimFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
        window.setTimeout(callback, 1000 / 60);
};

//global variables
var canvas,
    ctx,
    cloth,
    boundsx,
    boundsy,
    mouse = {
        down: false,
        button: 1,
        x: 0,
        y: 0,
        px: 0,
        py: 0
    };

/* Point class */
var Point = function (x, y) {

    //current x y
    this.x      = x;
    this.y      = y;

    // x y coords from previous frames 
    this.px     = x; 
    this.py     = y; 

    // velocity
    this.vx     = 0;
    this.vy     = 0;

    //pin to these coords if any
    this.pin_x  = null;
    this.pin_y  = null;
    
    //lines
    this.constraints = [];
};

/* updates point's location */ 
Point.prototype.update = function (delta) {

    //add gravity
    this.add_force(0, gravity);

    delta *= delta;
    nx = this.x + ((this.x - this.px) * 0.985) + ((this.vx / 2) * delta);
    ny = this.y + ((this.y - this.py) * 0.985) + ((this.vy / 2) * delta);

    this.px = this.x;
    this.py = this.y;

    this.x = nx;
    this.y = ny;

    this.vy = this.vx = 0
};


/* draws all connecting lines */ 
Point.prototype.draw = function () {

    if (!this.constraints.length) return;

    var i = this.constraints.length;
    while (i--) this.constraints[i].draw();
};

/* keep points & lines within boundaries */ 
Point.prototype.resolve_constraints = function () {

    //keep all pinned points pinned
    if (this.pin_x != null && this.pin_y != null) {
        this.x = this.pin_x;
        this.y = this.pin_y;
        return;
    }

    //update all line positions
    var i = this.constraints.length;
    while (i--) this.constraints[i].resolve();

    //confine points + constraints to boundaries
    this.x > boundsx ? this.x = 2 * boundsx - this.x : 1 > this.x && (this.x = 2 - this.x);
    this.y < 1 ? this.y = 2 - this.y : this.y > boundsy && (this.y = 2 * boundsy - this.y);
};


/* add new line between two points */
Point.prototype.attach = function (point) {

    this.constraints.push(
        new Constraint(this, point)
    );
};

/* remove line */
Point.prototype.remove_constraint = function (constraint) {

    this.constraints.splice(this.constraints.indexOf(constraint), 1);
};

/* add external velocities to point */
Point.prototype.add_force = function (x, y) {

    this.vx += x;
    this.vy += y;
};

/* set pin coordinates */
Point.prototype.pin = function (pinx, piny) {
    this.pin_x = pinx;
    this.pin_y = piny;
};

/* keep point pinned to mouse */
Point.prototype.stick_to_mouse = function () {
    this.x = mouse.x;
    this.y = mouse.y;
    this.px = mouse.px;
    this.py = mouse.py;
    this.pin(mouse.x,mouse.y);
};

/* Define lines between points */ 
var Constraint = function (p1, p2) {

    //takes two points and starting length
    this.p1     = p1;
    this.p2     = p2;
    this.length = spacing;
};

/* recalculate length & assign previous x y coordinates to points */
Constraint.prototype.resolve = function () {

    var diff_x  = this.p1.x - this.p2.x,
        diff_y  = this.p1.y - this.p2.y,
        dist    = Math.sqrt(diff_x * diff_x + diff_y * diff_y),
        diff    = (this.length - dist) / dist;

    var px = diff_x * diff * 0.2;
    var py = diff_y * diff * 0.2;

    this.p1.x += px;
    this.p1.y += py;
    this.p2.x -= px;
    this.p2.y -= py;
};

/* redraw line */
Constraint.prototype.draw = function () {

    ctx.moveTo(this.p1.x, this.p1.y);
    ctx.lineTo(this.p2.x, this.p2.y);
};

/* define cloth */
var Cloth = function () {

    this.points = [];
    console.log(start_y);
    console.log(start_x);

    start_x = canvas.width / 2 - cloth_width * spacing / 2;

    //create grid of points
    for (var y = 0; y <= cloth_height; y++) {

        for (var x = 0; x <= cloth_width; x++) {

            var p = new Point(start_x + x * spacing, start_y + y * spacing);

            //create lines between points 
            x != 0 && p.attach(this.points[this.points.length - 1]);
            //(y == 0 && x == 0) && p.pin(p.x, p.y); no longer pins to fixed point
            y != 0 && p.attach(this.points[x + (y - 1) * (cloth_width + 1)]);

            this.points.push(p);
        }
    }
};

/* update cloth by updating lines and points */
Cloth.prototype.update = function () {

    var i = physics_accuracy;

    while (i--) {
        var p = this.points.length;
        while (p--) this.points[p].resolve_constraints();
    }

    i = this.points.length;
    while (i--) this.points[i].update(.016);
};

/* redraw all lines & points */
Cloth.prototype.draw = function () {

    ctx.beginPath();

    var i = cloth.points.length;
    while (i--) cloth.points[i].draw();

    ctx.stroke();
};

/* update canvas */
function update() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cloth.update();
    cloth.draw();

    requestAnimFrame(update);
}

/* initialise canvas */ 
function start() {

    boundsx = canvas.width - 1;
    boundsy = canvas.height - 1;

    ctx.strokeStyle = '#888';
  
    cloth = new Cloth();
  
    update();

    canvas.onmousemove = function (e) {
        mouse.px  = mouse.x;
        mouse.py  = mouse.y;
        var rect  = canvas.getBoundingClientRect();
        mouse.x   = e.clientX - rect.left;
        mouse.y   = e.clientY - rect.top;

        //pin to mouse coordinates
        cloth.points[5* cloth_width/2].stick_to_mouse();

        e.preventDefault();
        start_x = mouse.x;
        start_y = mouse.y;
        console.log("start_y: " + start_x);
        console.log("start_x: " + start_y);
    };

    canvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
}

/* initialise window */ 
window.onload = function () {

    canvas  = document.getElementById('c');
    ctx     = canvas.getContext('2d');

    canvas.width  = 1200;
    canvas.height = 800;

    start();
};