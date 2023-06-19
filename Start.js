import {images} from './assets.js';
import {MusicStudio, Button} from './MusicStudio.js';

let X_SCALE;
let Y_SCALE;

export class StartScreen {
    constructor(canvas, keyMap, touchMap) {
        this.canvas = canvas;

        // Scalars to ensure all objects scale with window size (based on a 16:9 standard)
        X_SCALE = (this.canvas.width / 1280);
        Y_SCALE = (this.canvas.height / 720);

        this.keyMap = keyMap;
        this.touchMap = touchMap;
        this.ctx = this.canvas.getContext('2d');

        this.initializeButtons();
        this.initializeBackground();
        this.initializeFPS();
        this.started = false;
        this.game;
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

        const ratio = 1092/916;
        const buttonWidth = 300;
        const buttonHeight = buttonWidth / ratio;
        const paddingX = 250;
        const spacing = -2*buttonWidth - 2*paddingX + this.canvas.width;

        // First Button (Launch first game instance)
        const firstOptionX = paddingX;
        const firstOptionY = 300 * Y_SCALE;
        this.firstOptionButton = new Button(firstOptionX, firstOptionY, buttonWidth, buttonHeight, this.buttonCanvas, this.buttonCtx, this.touchMap, images['4/4']);
        
        // Second Button (Launch second game instance)
        const secondOptionX = firstOptionX + buttonWidth + spacing;
        const secondOptionY = firstOptionY;
        this.secondOptionButton = new Button(secondOptionX, secondOptionY, buttonWidth, buttonHeight, this.buttonCanvas, this.buttonCtx, this.touchMap, images['3/4']);
    }

    initializeBackground() {
        this.background = images['startbackground'];
        this.background.width = this.canvas.width;
        this.background.height = this.canvas.height;
    }

    initializeFPS() {
        this.frameCount = 0;
        this.fps = 60;
        this.now;
        this.elapsed;

        this.fpsInterval = 1000 / this.fps;
        this.then = Date.now();
        this.startTime = this.then;
    }

    mainLoop() {
        requestAnimationFrame(() => this.mainLoop());

        this.now = Date.now();
        this.elapsed = this.now - this.then;

        if (this.elapsed > this.fpsInterval) {
            this.then = this.now - (this.elapsed % this.fpsInterval);
            // Render start screen prior to any button press
            if (!this.started) {
                this.update();
                this.draw();
            }
            else {
                // Once a button is pressed, render the game
                this.game.mainLoop();
                if (this.game.backButton.flag) {
                    this.started = false;
                    this.game.resetGame();
                    this.game = undefined;
                }
            }

            var sinceStart = this.now - this.startTime;
            var currentFps = Math.round(1000 / (sinceStart / ++this.frameCount) * 100) / 100;
        }   
    }

    update() {
        this.firstOptionButton.update();
        this.secondOptionButton.update();

        // 4/4
        if (this.firstOptionButton.flag) {
            this.started = true;
            this.game = new MusicStudio(this.canvas, this.keyMap, this.touchMap, 15, 64, 50, 90, 16, 80);
            this.firstOptionButton.flag = false;
        }

        // 3/4
        if (this.secondOptionButton.flag) {
            this.started = true;
            this.game = new MusicStudio(this.canvas, this.keyMap, this.touchMap, 15, 48, 50, 90, 12, 80);
            this.secondOptionButton.flag = false;
        }
    }

    draw() {
        // Clear canvas and UI
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        this.buttonCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.started) {
            this.ctx.drawImage(this.background, 0, 0, this.background.width, this.background.height);
            this.firstOptionButton.draw();
            this.secondOptionButton.draw();
        }
    }
}