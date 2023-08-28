import {images} from './assets.js';
import {StartScreen} from './Start.js';

const PATH = "images/";
const PITCH_SEQUENCE = ['C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4','B4','C5'];

let X_SCALE;
let Y_SCALE;

export class MusicStudio {
    constructor(canvas, keyMap, touchMap, rowSize, colSize, colOffset, rowOffset, measureSize, bpm) {
        this.canvas = canvas;
        // Scalars to ensure all objects scale with window size (based on a 16:9 standard)
        X_SCALE = (this.canvas.width / 1280);
        Y_SCALE = (this.canvas.height / 720);

        this.keyMap = keyMap;
        this.touchMap = touchMap;
        this.ctx = canvas.getContext('2d');
        
        this.rowSize = rowSize;
        this.colSize = colSize;
        this.colOffset = X_SCALE * colOffset;
        this.rowOffset = Y_SCALE * rowOffset;
        this.measureSize = measureSize;
        this.bpm = bpm;
        this.saving = false;

        // Initialize game objects
        this.initializeSlots();
        this.initializeNotes();
        this.initializePlayLine();
        this.initializeButtons();
        this.initializeBackground();
        this.initializeFont();
    }

    initializeNotes() {
        this.notes = [];
        this.noteSequence = [];

        // Left/right padding for the row of notes
        const noteMinX = X_SCALE * 20;
        const noteMaxX = this.canvas.width - noteMinX;
        // Bottom padding for the row of notes
        const noteY = Y_SCALE * 660;

        // Space the notes evenly given the left/right bounds (depending on if whole note is included)
        const noteSeparation = (this.measureSize === 16) ? (1/7) * ((noteMaxX - noteMinX) - 52*this.slotWidth) : (1/6) * ((noteMaxX - noteMinX) - 36*this.slotWidth);
        for (let i=0; i<=this.colSize+1; i++) {
            // 16th note
            const sixteenth = new dragBox(noteMinX, noteY, this.slotWidth, this.slotHeight, [103,0,255], this.canvas, this.ctx, this.touchMap, this.slots, 1, this.colSize, this.rowSize, images['16th']);
            this.notes.push(sixteenth);
            
            // 8th note
            const eighth = new dragBox(noteMinX + this.slotWidth + noteSeparation, noteY, this.slotWidth*2, this.slotHeight, [208,69,233], this.canvas, this.ctx, this.touchMap, this.slots, 2, this.colSize, this.rowSize, images['8th']);
            this.notes.push(eighth);

            // Dotted 8th note
            const dottedEighth = new dragBox(noteMinX + 3*this.slotWidth + 2*noteSeparation, noteY, this.slotWidth*3, this.slotHeight, [0,104,255], this.canvas, this.ctx, this.touchMap, this.slots, 3, this.colSize, this.rowSize, images['dotted8th']);
            this.notes.push(dottedEighth);

            // Quarter note
            const quarter = new dragBox(noteMinX + 6*this.slotWidth + 3*noteSeparation, noteY, this.slotWidth*4, this.slotHeight, [0,195,255], this.canvas, this.ctx, this.touchMap, this.slots, 4, this.colSize, this.rowSize, images['4th']);
            this.notes.push(quarter);

            // Dotted quarter note
            const dottedQuarter = new dragBox(noteMinX + 10*this.slotWidth + 4*noteSeparation, noteY, this.slotWidth*6, this.slotHeight, [17,207,17], this.canvas, this.ctx, this.touchMap, this.slots, 6, this.colSize, this.rowSize, images['dotted4th']);
            this.notes.push(dottedQuarter);

            // Half note
            const half = new dragBox(noteMinX + 16*this.slotWidth + 5*noteSeparation, noteY, this.slotWidth*8, this.slotHeight, [255,255,0], this.canvas, this.ctx, this.touchMap, this.slots, 8, this.colSize, this.rowSize, images['half']);
            this.notes.push(half);           

            // Dotted half note
            const dottedHalf = new dragBox(noteMinX + 24*this.slotWidth + 6*noteSeparation, noteY, this.slotWidth*12, this.slotHeight, [255,185,0], this.canvas, this.ctx, this.touchMap, this.slots, 12, this.colSize, this.rowSize, images['dottedhalf']);
            this.notes.push(dottedHalf);           

            // Whole note
            const whole = new dragBox(noteMinX + 36*this.slotWidth + 7*noteSeparation, noteY, this.slotWidth*16, this.slotHeight, [255,23,0], this.canvas, this.ctx, this.touchMap, this.slots, 16, this.colSize, this.rowSize, images['whole']);
            this.notes.push(whole);           
        }
    }

    initializeSlots() {
        this.slots = [];

        // Calculate slot width/height based on canvas/offset dimensions
        this.slotWidth = (this.canvas.width - 2*this.colOffset) / this.colSize;
        this.slotHeight = ((this.canvas.height) - 2*this.rowOffset) / this.rowSize; 

        let index = -1;
        for (let j=0; j<this.rowSize; j++) {
            for (let i=0; i<this.colSize; i++) {
                index++;
                const slot = new slotBox(this.colOffset + i*this.slotWidth, this.rowOffset + j*this.slotHeight, this.slotWidth, this.slotHeight, [0,0,0,0], this.canvas, this.ctx, this.touchMap, index, this.measureSize, this.colSize);
                this.slots.push(slot);
            }
        }
    }

    initializePlayLine() {
        const playLineWidth = X_SCALE * 3;
        const playLineHeight = Y_SCALE * this.slotHeight * this.rowSize;
        this.playLine = new playLineBox(this.colOffset, this.rowOffset, playLineWidth, playLineHeight, [255,0,0], this.canvas, this.ctx, this.canvas.width - this.colOffset, this.bpm, this.measureSize);
        this.isPlayLineMoving = false;
    }

    initializeButtons() {
        // Create second UI canvas just for buttons
        this.buttonCanvas = document.createElement('canvas');
        document.getElementById('wrap').appendChild(this.buttonCanvas);
        // UI canvas should share same space as the game canvas
        this.buttonCanvas.width = this.canvas.width;
        this.buttonCanvas.height = this.canvas.height;
        this.buttonCanvas.style.position = 'absolute';
        // Only want touch/mouse actions on game canvas
        this.buttonCanvas.style.pointerEvents = 'none';
        this.buttonCtx = this.buttonCanvas.getContext('2d');

        // Keep all buttons the same dimension/size
        const ratio = 334/144;
        const buttonWidth = 140;
        const buttonHeight = buttonWidth / ratio;
        const paddingX = 400;
        // Space evenly based on padding
        const spacing = (1/2) * (-3*buttonWidth - 2*paddingX + this.canvas.width);

        // Play Button
        const playX = paddingX;
        const playY = (this.rowOffset - buttonHeight) / 2;
        this.playButton = new Button(playX, playY, buttonWidth, buttonHeight, this.buttonCanvas, this.buttonCtx, this.touchMap, images['play']);
        
        // Restart Button
        const restartX = playX + buttonWidth + spacing;
        const restartY = playY;
        this.restartButton = new Button(restartX, restartY, buttonWidth, buttonHeight, this.buttonCanvas, this.buttonCtx, this.touchMap, images['restart']);
    
        // Clear Button
        const clearX = restartX + buttonWidth + spacing;
        const clearY = playY;
        this.clearButton = new Button(clearX, clearY, buttonWidth, buttonHeight, this.buttonCanvas, this.buttonCtx, this.touchMap, images['clear']);
    
        // Save Button
        const saveX = this.canvas.width - this.colOffset - buttonWidth;
        const saveY = playY;
        this.saveButton = new Button(saveX, saveY, buttonWidth, buttonHeight, this.buttonCanvas, this.buttonCtx, this.touchMap, images['save']);

        // Download Button
        const downloadX = this.canvas.width/2 - buttonWidth/2;
        const downloadY = playY;
        this.downloadButton = new Button(downloadX, downloadY, buttonWidth, buttonHeight, this.buttonCanvas, this.buttonCtx, this.touchMap, images['download']);

        // Back Button
        const backX = this.colOffset;
        const backY = playY;
        this.backButton = new Button(backX, backY, buttonWidth, buttonHeight, this.buttonCanvas, this.buttonCtx, this.touchMap, images['back']);
    }

    initializeBackground() {
        this.background = images['background'];
        this.background.width = this.canvas.width;
        this.background.height = this.canvas.height;
    }

    initializeFont() {
        const font = new FontFace('Fresca', 'url(fonts/Fresca-Regular.ttf)', {
            style: 'normal',
        })
        this.alignOffset = 4;
    }

    mainLoop() {
        this.update();
        this.draw();
    }

    update() {
        for (const slot of this.slots) {
            slot.update();
        } 
        for (const note of this.notes) {
            note.update();
        }
        this.playButton.update();
        this.restartButton.update();
        this.clearButton.update();
        this.saveButton.update();
        this.downloadButton.update();
        this.backButton.update();

        // Can interact again once player is finished/reset
        if (this.playLine.minX == this.playLine.initialX) {
            this.toggleGameObjects(this.notes, true);
            this.toggleGameObjects([this.clearButton, this.saveButton], true);
        }

        // Set up audio sequence when play button is pressed
        if (this.playButton.flag) {
            if (this.playLine.paused && this.playLine.minX == this.playLine.initialX) {
                this.parseSlotData();
                // Disable interaction while player is enabled
                this.toggleGameObjects(this.notes, false);
                this.toggleGameObjects([this.clearButton, this.saveButton], false);
            }
            this.playLine.paused = false;
            this.playButton.flag = false;
        }

        // Play the audio sequence after play button is pressed
        if (!this.playLine.paused) {
            this.play();
        }

        // Reset the audio player
        if (this.restartButton.flag) {
            this.restart();
        }

        if (this.downloadButton.flag) {
            this.save();
            this.downloadButton.flag = false;
        }

        if (this.playLine.minX == this.playLine.initialX) {
            // Clear the notes from the grid
            if (this.clearButton.flag) {
                for (const note of this.notes) {
                    note.reset();
                }
                this.clearButton.flag = false;
            }
            // Enter saving mode
            if (this.saveButton.flag) {
                this.toggleGameObjects([this.downloadButton], true);
                const input = this.promptName();
                if (input != null) {
                    this.saving = true;
                    this.saveButton.changeImage(images['rename']);
                    this.toggleGameObjects([this.playButton, this.restartButton, this.clearButton], false);
                }
                this.saveButton.flag = false;
            }
        }

        if (this.backButton.flag && this.saving) {
            this.saving = false;
            this.saveButton.changeImage(images['save']);
            this.toggleGameObjects([this.downloadButton], false);
            this.toggleGameObjects([this.playButton, this.restartButton, this.clearButton], true);
            this.backButton.flag = false;
        }

        this.playLine.update(Date.now());
    }

    draw() {
        // Background
        this.clearBackground(this.ctx);
        this.ctx.drawImage(this.background, 0, 0, this.background.width, this.background.height);

        // Clear UI canvas
        this.clearBackground(this.buttonCtx);

        // Slots
        for (const slot of this.slots) {
            slot.draw();
        }

        // Pitch Labels
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = this.slotHeight.toString() + 'px Fresca';
        this.ctx.fillStyle = 'black';
        for (let i=PITCH_SEQUENCE.length-1; i>=0; i--) {
            this.ctx.fillText(PITCH_SEQUENCE[i].charAt(0), this.colOffset/2, this.alignOffset + this.rowOffset + this.slotHeight/2 + ((PITCH_SEQUENCE.length-1)-i)*this.slotHeight);
        }

        if (this.saving) {
            this.ctx.font = (this.slotHeight + 10).toString() + 'px Fresca';
            this.ctx.fillText(this.melodyName, this.canvas.width/2, this.canvas.height - this.rowOffset/2);

            for (const note of this.notes) {
                if (note.slotted) {
                    note.draw();
                }
            }

            this.downloadButton.draw();
        }
        else {
            // Note Blocks
            let frontNote;
            for (const note of this.notes) {
                if (this.touchMap.touchedObject === note) {
                    frontNote = note;
                    continue;
                }
                note.draw();
            }

            // Buttons
            this.playButton.draw();
            this.restartButton.draw();
            this.clearButton.draw();

            // Play Line
            this.playLine.draw();

            // Dragged Note Block
            if (frontNote != undefined) {
            frontNote.draw();
            }
        }

        this.saveButton.draw();
        this.backButton.draw();

        // Top Horizontal Line
        this.ctx.beginPath();
        this.ctx.moveTo(this.colOffset, this.rowOffset);
        this.ctx.lineTo(this.canvas.width - this.colOffset, this.rowOffset);
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'black';
        this.ctx.stroke();

        // Start and End Lines
        this.ctx.beginPath();
        this.ctx.moveTo(this.colOffset, this.rowOffset - 0.5);
        this.ctx.lineTo(this.colOffset, this.rowOffset + this.rowSize*this.slotHeight + 0.5);
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'black';
        this.ctx.stroke();
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - this.colOffset, this.rowOffset - 0.5);
        this.ctx.lineTo(this.canvas.width - this.colOffset, this.rowOffset + this.rowSize*this.slotHeight + 0.5);
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'black';
        this.ctx.stroke();
        this.ctx.lineWidth = 1;

        // Measure Lines
        for (let i=1; i<this.colSize/this.measureSize; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.colOffset + i * this.slotWidth * this.measureSize, this.rowOffset);
            this.ctx.lineTo(this.colOffset + i * this.slotWidth * this.measureSize, this.rowOffset + this.rowSize*this.slotHeight);
            this.ctx.lineWidth = 4;
            this.ctx.strokeStyle = 'black';
            this.ctx.stroke();
            this.ctx.lineWidth = 1;
        }

        // Mid-Measure Lines
        for (let i=1; i<this.colSize/(0.25 * this.measureSize); i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.colOffset + i * this.slotWidth * 4, this.rowOffset);
            this.ctx.lineTo(this.colOffset + i * this.slotWidth * 4, this.rowOffset + this.rowSize*this.slotHeight);
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = 'black';
            this.ctx.stroke();
            this.ctx.lineWidth = 1;
        }
    }

    parseSlotData() {
        for (let i=0; i<this.colSize; i++) {
            this.noteSequence = [];
        }
        for (let i=0; i<this.colSize; i++) {
            for (let j=0; j<this.rowSize; j++) {
                const slot = this.slots[i + this.colSize * j];
                // When slot has a note, find the correct sound key
                if (slot.containedBox != undefined) {
                    this.noteSequence.push({
                        sound: slot.pitch.concat(slot.containedBox.duration),
                        pos: slot.minX,
                    });
                }
            }
        }
    }

    play() {
        for (const note of this.noteSequence) {
            // Only play sound from slot the playline is currently passing
            if (this.playLine.minX >= note.pos && note.hasPlayed != true) {
                lowLag.play(note.sound);
                note.hasPlayed = true;
            }
        }
    }

    restart() {
        // Reset playline
        this.playLine.minX = this.playLine.initialX;
        this.playLine.paused = true;
        this.restartButton.flag = false;
        // Stop all sounds
        for (const note of this.noteSequence) {
            lowLag.stop(note.sound);
        }
    }

    save() {
        var link = document.getElementById('link');
        link.setAttribute('download', this.melodyName + '.png');
        link.setAttribute('href', this.canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream'));
        link.click();
    }

    promptName() {
        let input = prompt('Enter your melody name:', 'My Melody');
        this.melodyName = (input != null) ? input : this.melodyName;
        return input;
    }

    toggleGameObjects(objects, toggle) {
        for (const o of objects) {
            o.enabled = toggle;
        }
    }

    clearBackground(ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    resetGame() {
        // On destroy: remove extra canvases
        this.buttonCanvas.remove();
        this.restart();
    }
}

class dragBox {
    constructor(minX, minY, width, height, color, canvas, ctx, touchMap, slots, multiple, colSize, rowSize, image) {
        this.minX = minX;
        this.minY = minY;
        this.width = width;
        this.height = height;
        this.color = color;
        this.canvas = canvas;
        this.ctx = ctx;
        this.touchMap = touchMap;
        this.slots = slots;
        this.multiple = multiple;
        this.colSize = colSize;
        this.rowSize = rowSize;

        this.initDuration();

        // Fit image inside box
        this.image = image;
        const imageOffsetX = 3 * X_SCALE;
        resizeImage(width - imageOffsetX, height, this.image);
        this.imageOffsetX = imageOffsetX;

        this.initialX = this.minX;
        this.initialY = this.minY;
        this.slotted = false;
        this.leftMostSlot;
        this.canDrop = false;
        this.enabled = true;
        this.alpha = 1;
    }

    initDuration() {
        this.duration = '';
        switch(this.multiple) {
            case 1:
                this.duration = '16th';
                break;
            case 2:
                this.duration = '8th';
                break;
            case 3:
                this.duration = 'dotted8th';
                break;
            case 4:
                this.duration = '4th';
                break;
            case 6:
                this.duration = 'dotted4th';
                break;
            case 8:
                this.duration = 'half';
                break;
            case 12:
                this.duration = 'dottedhalf';
                break;
            case 16:
                this.duration = 'whole';
                break;
        }
    }

    setAsTouchedObject() {
        if (this.touchMap.initialTouch) {
            if (intersectBox(this.touchMap.pos[0], this.touchMap.pos[1], this.minX, this.minY, this.width, this.height)) {
                this.touchMap.touchedObject = this;
            };
        }
    }

    update() {
        if (this.enabled) {
            // Check if this block is being touched
            this.setAsTouchedObject();

            const center = [this.minX + this.width/2, this.minY + this.height/2];

            // When this block is being touched
            if (this.touchMap.touchedObject === this) {
                this.slotted = false;
                this.canDrop = false;

                // When this block is removed from a slot
                if (this.leftMostSlot != undefined && this.leftMostSlot.containedBox === this) {
                    for (let i=0; i<this.multiple; i++) {
                        const index = this.slots.indexOf(this.leftMostSlot);
                        this.slots[i + index].occupied = false;
                    }
                    this.leftMostSlot.containedBox = undefined;
                }
                // On block pickup/drag
                this.leftMostSlot = undefined;
                this.minX = this.touchMap.pos[0] - this.width/2;
                this.minY = this.touchMap.pos[1] - this.height/2;
                this.alpha = 0.75;
                for (const slot of this.slots) {
                    // When this block is above a slot
                    if (intersectBox(center[0], center[1], slot.minX, slot.minY, slot.width, slot.height)) {
                        const slotIndex = this.slots.indexOf(slot);
                        var minLeftIndex = slotIndex - Math.floor(this.multiple/2);
                        var maxRightIndex = slotIndex + (this.multiple - Math.floor(this.multiple/2 + 1));

                        if (mod(minLeftIndex, this.colSize) > mod(slotIndex,this.colSize)) {
                            minLeftIndex = Math.floor(slotIndex/this.colSize)*this.colSize;
                            maxRightIndex = minLeftIndex + (this.multiple - 1);
                        }
                        if (mod(maxRightIndex, this.colSize) < mod(slotIndex,this.colSize)) {
                            maxRightIndex = Math.ceil(slotIndex/this.colSize)*this.colSize-1;
                            minLeftIndex = maxRightIndex - (this.multiple - 1);
                        }
                        
                        // Set green/red color of slot
                        this.leftMostSlot = this.slots[minLeftIndex];
                        let color = [255,0,0,0.5];
                        if (this.leftMostSlot.canDropIntoSlot(this) && !areBoxesInCol(this.slots, this, this.leftMostSlot)) {
                            color = [0,255,0,0.5];
                            this.canDrop = true;
                        }
                        for (let i=minLeftIndex; i<=maxRightIndex; i++) {
                            this.slots[i].color = color;
                        }
                    }
                }
            }

            // When this block is being dropped
            else if (!this.slotted) {
                this.alpha = 1;
                // Snap to slot if allowed
                if (this.leftMostSlot != undefined && this.canDrop) {
                    this.minX = this.leftMostSlot.minX;
                    this.minY = this.leftMostSlot.minY;
                    this.leftMostSlot.containedBox = this;
                    for (let i=0; i<this.multiple; i++) {
                        this.slots[i + this.slots.indexOf(this.leftMostSlot)].occupied = true;
                    }
                    this.slotted = true;
                }
                // Otherwise, snap back to origin
                else {
                    this.minX = this.initialX;
                    this.minY = this.initialY;
                }
            }
        }
    }

    draw() {
        // Transparent when disabled (not slotted ones)
        if (!this.enabled && !this.slotted) {
            this.alpha = 0.0075;
        }

        this.ctx.globalAlpha = this.alpha;
        // Render block with color
        const [r,g,b] = this.color;
        this.ctx.fillStyle = `rgba(${r},${g},${b})`;
        this.ctx.fillRect(this.minX, this.minY, this.width, this.height);

        // Render sprite on this block
        this.ctx.drawImage(this.image, this.minX + this.imageOffsetX, this.minY, this.image.width, this.image.height);
        this.ctx.globalAlpha = 1;
    }

    reset() {
        // Snap back to original position
        this.minX = this.initialX;
        this.minY = this.initialY;

        // Unbind from all respective slots
        if (this.leftMostSlot != undefined && this.leftMostSlot.containedBox === this) {
            for (let i=0; i<this.multiple; i++) {
                const index = this.slots.indexOf(this.leftMostSlot);
                this.slots[i + index].occupied = false;
            }
            this.leftMostSlot.containedBox = undefined;
        }
        this.leftMostSlot = undefined;
    }
}

class slotBox {
    constructor(minX, minY, width, height, color, canvas, ctx, touchMap, index, measureSize, colSize) {
        this.minX = minX;
        this.minY = minY;
        this.width = width;
        this.height = height;
        this.color = color;
        this.canvas = canvas;
        this.ctx = ctx;
        this.touchMap = touchMap;
        this.index = index;
        this.measureSize = measureSize;
        this.colSize = colSize;

        this.initPitch();

        this.initialX = this.minX;
        this.initialY = this.minY;
        this.initialColor = this.color;
        this.containedBox;
        this.occupied = false;
    }

    initPitch() {
        // Get y index in grid -> set corresponding pitch
        const rowIndex = Math.floor(this.index / this.colSize);
        const reverseIndex = (PITCH_SEQUENCE.length - 1) - rowIndex;
        this.pitch = PITCH_SEQUENCE[reverseIndex];
    }

    update() {
        this.color = this.initialColor;
    }

    draw() {
        // Slot interior color
        const [r,g,b,a] = this.color;
        this.ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        this.ctx.fillRect(this.minX, this.minY, this.width, this.height);

        // Slot outline (just the bottom line)
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.minX, this.minY + this.height);
        this.ctx.lineTo(this.minX + this.width, this.minY + this.height);
        this.ctx.stroke();
    }

    canDropIntoSlot(dragBox) {
        let canDrop = true;
        switch(dragBox.multiple) {
            case 1:
                break;
            case 2:
                if (this.index % 4 == 3) {
                    canDrop = false;
                }
                break;
            case 3:
                if (this.index % 4 >= 2) {
                    canDrop = false;
                }
                break;
            case 4:
                if (this.index % 4 >= 1) {
                    canDrop = false;
                }
                break;
            case 6:
                if (this.index % 4 >= 1 || this.index % this.measureSize >= this.measureSize - 4) {
                    canDrop = false;
                }
                break;
            case 8:
                if (this.index % 4 >= 1 || this.index % this.measureSize >= this.measureSize - 4) {
                    canDrop = false;
                }
                break;
            case 12:
                if (this.index % 4 >= 1 || this.index % this.measureSize >= this.measureSize - 8) {
                    canDrop = false;
                }
                break;
            case 16:
                if (this.index % this.measureSize != 0) {
                    canDrop = false;
                }
                break;
        }
        return canDrop;
    }
}

class playLineBox {
    constructor(minX, minY, width, height, color, canvas, ctx, endPt, bpm, beatCount) {
        this.minX = minX;
        this.minY = minY;
        this.width = width;
        this.height = height;
        this.color = color;
        this.canvas = canvas;
        this.ctx = ctx;
        this.endPt = endPt;
        this.bpm = bpm;
        this.beatCount = beatCount;
        this.initialX = minX;

        this.paused = true;

        // Calculate speed value given bpm, beat count, length of grid
        const d = this.endPt - this.minX;
        const t = 60 * (this.beatCount / this.bpm);
        const f = 60 * t;
        this.speed = ((d - this.minX) / f) * (60 / 1000);

        this.dt = 0;
        this.lastUpdate = 0;
    }

    update(t) {
        // Measure time between frames to ensure constant speed
        this.dt = t - this.lastUpdate;
        this.lastUpdate = t;
        if (this.minX >= this.endPt) {
            this.minX = this.initialX;
            this.paused = true;
        }

        if (!this.paused) {
            this.minX += this.speed * this.dt;
        }
    }

    draw() {
        const [r,g,b] = this.color;
        this.ctx.fillStyle = `rgb(${r},${g},${b})`;
        this.ctx.fillRect(this.minX, this.minY, this.width, this.height);
    }
}

export class Button {
    constructor(minX, minY, width, height, canvas, ctx, touchMap, image) {
        this.minX = minX;
        this.minY = minY;
        this.canvas = canvas;
        this.ctx = ctx;
        this.touchMap = touchMap;
        this.width = width;
        this.height = height;

        this.image = image
        this.image.width = width;
        this.image.height = height;

        this.enabled = true;
        this.alpha = 1;
        this.clicked = false;
        this.flag = false;
        this.useTransparent = false;
    }

    changeImage(image) {
        this.image = image;
        this.image.width = this.width;
        this.image.height = this.height;
    }

    update() {
        if (this.enabled) {
            this.setAsTouchedObject();

            // When button is released
            if (this.touchMap.release && this.clicked) {
                this.touchMap.release = false;
                this.flag = true;
            }
    
            // When button is clicked on
            if (this.touchMap.touchedObject === this 
                && this.touchMap.press 
                && (this.ctx.getImageData(this.touchMap.pos[0], this.touchMap.pos[1], 1, 1).data[3] > 0 || this.useTransparent) 
                && intersectBox(this.touchMap.pos[0], this.touchMap.pos[1], this.minX, this.minY, this.image.width, this.image.height)) {
                this.alpha = 0.75;
                this.clicked = true;
            }
            // When button is not clicked on
            else {
                this.alpha = 1;
                this.clicked = false;
            }
        }
    }

    draw() {
        // Transparent when disabled
        if (!this.enabled) {
            this.alpha = 0.5;
        }
        this.ctx.globalAlpha = this.alpha;
        this.ctx.drawImage(this.image, this.minX, this.minY, this.image.width, this.image.height);
        this.ctx.globalAlpha = 1;
    }

    setAsTouchedObject() {
        if (this.touchMap.initialTouch) {
            if (intersectBox(this.touchMap.pos[0], this.touchMap.pos[1], this.minX, this.minY, this.image.width, this.image.height)) {
                this.touchMap.touchedObject = this;
            };
        }
    }
}

export function intersectBox(x, y, minX, minY, width, height) {
    const maxX = minX + width;
    const maxY = minY + height;
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return true;
    }
    return false;
}

function mod(n, m) {
    return ((n % m) + m) % m;
}

function areBoxesInCol(slots, dragBox, slot) {
    //Check on the same row
    for (let i=0; i<dragBox.multiple; i++) {
        if (slots[i + slot.index].occupied) {
            return true;
        }
    }
    
    // Check above
    let index = slot.index - dragBox.colSize;
    while (index >= 0) {
        for (let i=0; i<dragBox.multiple; i++) {
            if (slots[i + index].occupied) {
                return true;
            }
        }
        index = index - dragBox.colSize;
    }

    //Check below
    index = slot.index + dragBox.colSize;
    while (index < slots.length) {
        for (let i=0; i<dragBox.multiple; i++) {
            if (slots[i + index].occupied) {
                return true;
            }
        }
        index = index + dragBox.colSize;
    }
    return false;
}

function resizeImage(width, height, image) {
    const imgRatio = image.width / image.height;
    const widthRatio = image.width / width;
    const heightRatio = image.height / height;

    if (widthRatio < heightRatio) {
        image.height = height;
        image.width = imgRatio * height;
    }
    else {
        image.width = width;
        image.height = height;
    }
}