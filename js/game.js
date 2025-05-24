// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Game variables
let bird;
let pipes;
let ground;
let ceiling;
let scoreText;
let score = 0;
let gameOver = false;
let spaceKey;
let background;
let isPlaying = false;
let gameStartText;
let pipeTimer;
let gameSpeed = 200;
let achievementText;
let achievementShown = {};  // Track which achievements have been shown

// Text style configuration
const textStyles = {
    score: { fontFamily: 'Rubik', fontSize: '24px', fill: '#000', fontStyle: 'bold' },
    gameStart: { fontFamily: 'Rubik', fontSize: '20px', fill: '#000' },
    gameOver: { fontFamily: 'Rubik', fontSize: '24px', fill: '#000', align: 'center' },
    achievementTitle: { fontFamily: 'Rubik', fontSize: '24px', fill: '#ffff00', fontStyle: 'bold' },
    achievementLetter: { fontFamily: 'Rubik', fontSize: '72px', fill: '#ffffff', fontStyle: 'bold' },
    achievementMessage: { fontFamily: 'Rubik', fontSize: '16px', fill: '#ffffff' }
}

// Achievement definitions
const achievements = {
    5: { letter: 'A', message: 'Helvetes, jag ser inget.' },
    10: { letter: 'L', message: 'Vad är det för jävla bokstav' },
    15: { letter: '7', message: 'Vafan, en jävla siffra?!' },
    20: { letter: 'N', message: 'Låt mig gibba ifred' },
    30: { letter: 'E', message: 'Är dom bokstäverna viktiga' },
    50: { letter: 'F', message: 'Master Flapper!' },
};

// Create game instance
const game = new Phaser.Game(config);

// Load game assets
function preload() {
    // Load game images
    this.load.image('background', 'assets/images/background.svg');
    this.load.image('bird', 'assets/images/bird.svg');
    this.load.image('pipe', 'assets/images/pipe.svg');
    this.load.image('ground', 'assets/images/ground.svg');
}

// Create game objects
function create() {
    // Add background
    background = this.add.tileSprite(0, 0, config.width, config.height, 'background').setOrigin(0, 0);
    
    // Create ground and ceiling
    ground = this.physics.add.staticGroup();
    ground.create(config.width / 2, config.height - 20, 'ground').setScale(2, 0.5).refreshBody();
    
    ceiling = this.physics.add.staticGroup();
    ceiling.create(config.width / 2, -10, 'ground').setScale(2, 0.5).refreshBody().setVisible(false);
    
    // Create pipes group
    pipes = this.physics.add.group();
      // Create bird
    bird = this.physics.add.sprite(80, config.height / 2, 'bird');
    bird.setScale(1, 1); // SVG doesn't need scaling down
    bird.setBounce(0.2);
    bird.setCollideWorldBounds(true);
    bird.body.allowGravity = false;
    
    // Add collisions
    this.physics.add.collider(bird, ground, gameOverHandler, null, this);
    this.physics.add.collider(bird, ceiling, gameOverHandler, null, this);
    this.physics.add.collider(bird, pipes, gameOverHandler, null, this);
      // Add score text
    scoreText = this.add.text(16, 16, 'Score: 0', textStyles.score);
      // Add game start text
    gameStartText = this.add.text(
        config.width / 2, 
        config.height / 2, 
        'Tap or Press Spacebar to Start', 
        textStyles.gameStart
    ).setOrigin(0.5);
    
    // Handle input
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      // Add pointer (touch/mouse) input
    this.input.on('pointerdown', flap, this);
}

// Update game state
function update() {
    if (!isPlaying) {
        if (spaceKey.isDown || this.input.activePointer.isDown) {
            startGame.call(this);
        }
        return;
    }
    
    if (gameOver) {
        return;
    }
      // Scroll background
    background.tilePositionX += 0.5;
    
    // Update bird rotation based on velocity (makes the game look more polished)
    if (bird.body.velocity.y > 0) {
        // Bird is falling, rotate downward (max 90 degrees)
        bird.angle = Math.min(bird.angle + 2, 90);
    } else {
        // Bird is rising, rotate upward (max -30 degrees)
        bird.angle = Math.max(-30, bird.angle - 5);
    }    // Keep track of pipe IDs that have been scored this frame
    const scoredPipeIds = new Set();
    
    // Update score for pipes passed
    pipes.getChildren().forEach(pipe => {
        // Check if pipe has passed the bird and hasn't been scored yet
        if (pipe.getBounds().right < bird.x && !pipe.scored) {
            // Only count top pipes to avoid double counting
            if (pipe.isPipeTop && !scoredPipeIds.has(pipe.pipeId)) {
                score += 1;  // Award 1 point for passing a pipe pair
                scoreText.setText('Score: ' + score);
                scoredPipeIds.add(pipe.pipeId);
                
                // Check if player just reached an achievement score
                if (achievements[score] && !achievementShown[score]) {
                    showAchievementLetter.call(this, achievements[score].letter, achievements[score].message);
                }
            }
            pipe.scored = true;
        }
    });
    
    // Clean up pipes that have left the screen
    pipes.getChildren().forEach(pipe => {
        if (pipe.getBounds().right < 0) {
            pipe.destroy();
        }
    });
}

// Start the game
function startGame() {
    isPlaying = true;
    gameStartText.setVisible(false);
    bird.body.allowGravity = true;
    flap.call(this);
    
    // Start creating pipes
    pipeTimer = this.time.addEvent({
        delay: 1500,
        callback: createPipes,
        callbackScope: this,
        loop: true
    });
}

// Flap the bird
function flap() {
    if (gameOver || !isPlaying) {
        return;
    }
    
    bird.setVelocityY(-350);
    // Set a slight upward rotation when flapping
    bird.angle = -20;
}

// Create pipes
function createPipes() {
    if (gameOver) {
        return;
    }
    
    const pipeGap = 150;
    const pipeVerticalPosition = Phaser.Math.Between(100, config.height - pipeGap - 100);    // Top pipe
    const topPipe = pipes.create(config.width, pipeVerticalPosition - pipeGap / 2, 'pipe');
    topPipe.setOrigin(0.5, 1);
    topPipe.setScale(1);
    topPipe.scored = false;
    topPipe.isPipeTop = true;  // Mark as top pipe
    topPipe.pipeId = Date.now();  // Unique ID for this pipe pair
    topPipe.body.allowGravity = false;
    topPipe.setVelocityX(-gameSpeed);
    
    // Bottom pipe
    const bottomPipe = pipes.create(config.width, pipeVerticalPosition + pipeGap / 2, 'pipe');
    bottomPipe.setOrigin(0.5, 0);
    bottomPipe.setScale(1);
    bottomPipe.scored = false;
    bottomPipe.isPipeTop = false;  // Mark as bottom pipe
    bottomPipe.pipeId = topPipe.pipeId;  // Same ID as its top pair
    bottomPipe.body.allowGravity = false;
    bottomPipe.setVelocityX(-gameSpeed);    // Add to difficulty as score increases
    if (score > 10) {
        gameSpeed = 250;
    } else if (score > 5) {
        gameSpeed = 220;
    }
}

// Game over handler
function gameOverHandler() {
    gameOver = true;
    
    if (pipeTimer) {
        pipeTimer.remove();
    }
    
    // Stop all pipes
    pipes.getChildren().forEach(pipe => {
        pipe.setVelocityX(0);
    });
      // Game over text
    this.add.text(
        config.width / 2, 
        config.height / 2, 
        'Game over, noob\nScore: ' + score + '\nTap or Press Spacebar \n to Restart', 
        textStyles.gameOver
    ).setOrigin(0.5);
    
    // Allow restart
    this.input.on('pointerdown', restartGame, this);
    spaceKey.once('down', restartGame, this);
}

// Restart the game
function restartGame() {
    this.scene.restart();
    gameOver = false;
    isPlaying = false;
    score = 0;
    gameSpeed = 200;
    achievementShown = {};  // Reset shown achievements
}

// Show achievement letter
function showAchievementLetter(letter, message) {
    if (achievementShown[score]) return;
    
    achievementShown[score] = true;
    
    // Create a letter background
    const letterBg = this.add.graphics();
    letterBg.fillStyle(0x000000, 0.7);
    letterBg.fillRoundedRect(config.width/2 - 125, config.height/2 - 80, 250, 160, 20);    // Add congratulation text
    const titleText = this.add.text(
        config.width/2, 
        config.height/2 - 50, 
        "VAD FAN ÄR DETTA?", 
        textStyles.achievementTitle
    ).setOrigin(0.5);
    
    // Add the letter
    const letterText = this.add.text(
        config.width/2, 
        config.height/2, 
        letter, 
        textStyles.achievementLetter
    ).setOrigin(0.5);
      // Add explanation
    const explanationText = this.add.text(
        config.width/2, 
        config.height/2 + 50, 
        message, 
        textStyles.achievementMessage
    ).setOrigin(0.5);// Make it disappear after 2 seconds
    this.time.delayedCall(2000, function() {
        letterBg.destroy();
        letterText.destroy();
        titleText.destroy();
        explanationText.destroy();
    }, [], this);
}
