#Shape Your Music
[Live Demo](https://ejarzo.github.io/sym_v2)


##Setup
To start simple clone the folder and open index.html in a browser (preferably chrome).

##The Idea

Shape Your Music is a visual composition language for creating music. It translates visual space to musical space. The user creates shapes that represent melodies. 

##How it works


##Controls
Use the controls at the top of the screen to control playback and mode, as well as canvas and musical properties.

###Play/Stop
Pressing play starts all shapes at their origin point. Shapes play in the order that they were drawn.

###Record
Pressing record allows you to download your project as an audio file. If playback is stopped, recording will begin when you begin playback. If he song is playing, the recording will start instantly. Pressing stop or record will end the recording and show a window where you can listen and download what you just recorded

###Draw
Draw mode allows you to create shapes. click to place vertices. Click on the origin point to complete a shape. Select your draw color by using the colored box within the draw tool button.

###Edit
Edit mode allows you to adjust your shapes. Drag vertices to edit the perimeter of your shape. drag the whole shape to move it. Click on a shape to show more detailed options (see shape controls).

###Grid
When selected, the grid is shown

###Snap to Grid
When selected, all points will snap to the grid when drawn.

###Auto-quantize 
When selected, shapes will snap and lock to the same length - so that they will loop at the same time. Shapes can be “halved’ or “doubled” so that they loop half or twice as often. This allows for a defined rhythm. 

###Tempo
Change the speed of playback

###Key
Select the root note 

###Scale
Select the musical scale

###Fullscreen
Toggle fullscreen

###Clear
Clear the canvas 

##Shape Controls
Click on a shape to display a dialogue box that allows you to edit the shape in detail.

###X-axis
A shape’s position on the x axis corresponds to its stereo pan

###Y-axis
A shape’s position on the y axis corresponds to its starting note. Higher shapes start on higher notes.

###Color
Select the shape's color. The color determines what sound it generates. Control the synth types and tones for each color using the toolbar at the bottom of the screen.

###Mute
Select to mute the shape. A muted shape generates no sound.

###Solo
Select to hear only that shape.

###Quantize
Snap the shape perimeter length to the global quantization length.
    
###Starting Note
Manually adjust the starting note of the shape - this value will be overwritten (by the y-axis property) if you move the shape.

###*2
Double the perimeter of the shape, preserving angles

###/2
Halve the perimeter of the shape, preserving angles

###To Front
Bring the shape to the front of the canvas 

###To back
Move the shape to the back of the canvas

###Delete
Remove the shape

##Instruments 
At the bottom of the screen there is a toolbar that displays the different instruments. Each one has a unique color and a synth. Different colors can be assigned to the same synth. Selecting a different synth changes the sound for all shapes of that color. Use the four knobs to adjust the timbre of the sound.
