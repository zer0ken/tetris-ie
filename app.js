window.onload = function () {
    window = new App
}

var console = window.console || { log: function () { } }

function isElement(obj) {
    try {
        //Using W3 DOM2 (works for FF, Opera and Chrome)
        return obj instanceof HTMLElement;
    }
    catch (e) {
        //Browsers not supporting W3 DOM2 don't have HTMLElement and
        //an exception is thrown and we end up here. Testing some
        //properties that all elements have (works on IE7)
        return (typeof obj === "object") &&
            (obj.nodeType === 1) && (typeof obj.style === "object") &&
            (typeof obj.ownerDocument === "object");
    }
}

function nodeListToArray(nodeList) {
    var children = []
    for (var i = 0; i < nodeList.length; i++) {
        var node = nodeList[i];
        if (isElement(node)) {
            children.push(node)
        }
    }
    return children
}

if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== 'function') {
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () { },
            fBound = function () {
                return fToBind.apply(this instanceof fNOP
                    ? this
                    : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        if (this.prototype) {
            fNOP.prototype = this.prototype;
        }
        fBound.prototype = new fNOP();

        return fBound;
    };
}

if (!window.addEventListener && window.attachEvent) {
    window.addEventListener = window.attachEvent
}

if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback) {
        setTimeout(callback, 1000 / FPS)
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// App
///////////////////////////////////////////////////////////////////////////////////////////////////

var CONTROLS = {
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    ROTATE_RIGHT: 'rotateRight',
    ROTATE_LEFT: 'rotateLeft',
    SOFT_DROP: 'softDrop',
    HARD_DROP: 'hardDrop',
    HOLD: 'hold',
    PAUSE: 'pause',
    RESET: 'reset'
}

var KEYMAP = {
    38: CONTROLS.ROTATE_RIGHT,
    88: CONTROLS.ROTATE_RIGHT,
    90: CONTROLS.ROTATE_LEFT,
    17: CONTROLS.ROTATE_LEFT,
    37: CONTROLS.MOVE_LEFT,
    39: CONTROLS.MOVE_RIGHT,
    16: CONTROLS.HOLD,
    67: CONTROLS.HOLD,
    32: CONTROLS.HARD_DROP,
    40: CONTROLS.SOFT_DROP,
    27: CONTROLS.PAUSE,
    82: CONTROLS.RESET
}

var BUTTON_STATE = {
    ON: 'button on',
    OFF: 'button off'
}

function App() {
    this.paused = false
    this.gravity = 1
    this.ghost = true

    window.addEventListener('keydown', this.onKeyDown.bind(this), false)
    window.addEventListener('keyup', this.onKeyUp.bind(this), false)

    window.requestAnimationFrame(this.animate.bind(this))

    this.board = new Board(this.gravity, this.ghost)

    this.pauseBTN = document.getElementById('pause')
    this.pauseBTN.onclick = this.togglePause.bind(this)

    this.resetBTN = document.getElementById('reset')
    this.resetBTN.onclick = this.reset.bind(this)

    this.gravityBTN = document.getElementById('gravity')
    this.gravityBTN.onclick = this.setGravity.bind(this)
    this.gravityDisplay = document.getElementById('gravity-value')

    this.ghostBTN = document.getElementById('ghost')
    this.ghostBTN.onclick = this.toggleGhost.bind(this)
    this.ghostDisplay = document.getElementById('ghost-value')

    this.pressing = {}
}

App.prototype.animate = function () {
    window.requestAnimationFrame(this.animate.bind(this))
    this.board.animate()

    if (this.board.state == BOARD_STATE.PLAYING) {
        var pressingKeys = Object.keys(this.pressing)
        for (var i = 0; i < pressingKeys.length; i++) {
            var key = pressingKeys[i]
            var keymap = KEYMAP[key]
            if (keymap == CONTROLS.MOVE_LEFT
                || keymap == CONTROLS.MOVE_RIGHT
                || keymap == CONTROLS.SOFT_DROP) {
                this.pressing[key]++
                if (this.pressing[key] >= this.board.das) {
                    this.pressing[key] -= Math.max(this.board.das / DAS_SCALE, 1)
                    this.control(KEYMAP[key])
                }
            }
        }
    }
}

App.prototype.onKeyDown = function (e) {
    var control = KEYMAP[e.keyCode]
    if (control && !(e.keyCode in this.pressing)) {
        this.pressing[e.keyCode] = 0
        if (this.control(control)) {
            e.preventDefault()
        }
    }
}

App.prototype.control = function (control) {
    switch (control) {
        case CONTROLS.PAUSE:
            this.togglePause()
            break
        case CONTROLS.RESET:
            this.reset()
            break
    }
    if (this.board.state == BOARD_STATE.PLAYING) {
        switch (control) {
            case CONTROLS.MOVE_LEFT:
                this.board.move(-1)
                break
            case CONTROLS.MOVE_RIGHT:
                this.board.move(1)
                break
            case CONTROLS.SOFT_DROP:
                this.board.softDrop()
                break
            case CONTROLS.HARD_DROP:
                this.board.hardDrop()
                break
            case CONTROLS.ROTATE_LEFT:
                this.board.rotate(-1)
                break
            case CONTROLS.ROTATE_RIGHT:
                this.board.rotate(1)
                break
            case CONTROLS.HOLD:
                this.board.hold()
                break
            default:
                return false
        }
        return true
    }
    return false
}

App.prototype.onKeyUp = function (e) {
    delete this.pressing[e.keyCode]
}

App.prototype.togglePause = function () {
    if (this.board.state == BOARD_STATE.PLAYING) {
        this.board.state = BOARD_STATE.PAUSED
        this.pauseBTN.className = BUTTON_STATE.ON
    } else if (this.board.state == BOARD_STATE.PAUSED) {
        this.board.state = BOARD_STATE.PLAYING
        this.pauseBTN.className = BUTTON_STATE.OFF
    }
}

App.prototype.reset = function () {
    if (this.board.state != BOARD_STATE.PLAYING) {
        this.board.init()
    } else {
        this.togglePause()
    }
}

App.prototype.setGravity = function () {
    if (this.board.state == BOARD_STATE.PLAYING) {
        this.togglePause()
    }
    var gravity = parseInt(window.prompt('Input New Gravity(1 ~ 20).', this.gravity))
    if (gravity != NaN && gravity >= 1 && gravity <= 20) {
        this.gravity = gravity
        this.board.config(gravity, this.ghost)
        this.gravityDisplay.textContent = gravity
    }
}

App.prototype.toggleGhost = function () {
    if (this.board.state == BOARD_STATE.PLAYING) {
        this.togglePause()
    }
    this.ghost = !this.ghost
    this.ghostDisplay.textContent = this.ghost ? 'ON' : 'OFF'
    this.board.config(this.gravity, this.ghost)
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Board
///////////////////////////////////////////////////////////////////////////////////////////////////

var BOARD_STATE = {
    DEAD: 0,
    PLAYING: 1,
    PAUSED: 2
}

var FPS = 60

var DAS_SCALE = 20

var MIN_DAS = 10
var BOARD_ROW = 23
var BOARD_COL = 10

var SCORE_TYPE = {
    DROP: { score: 4 },
    SINGLE_LINE: { score: 100 },
    DOUBLE_LINE: { score: 300, description: 'DOUBLE +', type: 'silver' },
    TRIPLE_LINE: { score: 500, description: 'TRIPLE +', type: 'silver' },
    TETRIS: { score: 1000, description: 'TETRIS +', type: 'gold' },
    PERFECT_CLEAR: { score: 10000, description: 'PERFECT CLEAR +', type: 'aqua' },
    COMBO: { description: 'COMBO +' }
}

var LINE_SCORE = {
    1: SCORE_TYPE.SINGLE_LINE,
    2: SCORE_TYPE.DOUBLE_LINE,
    3: SCORE_TYPE.TRIPLE_LINE,
    4: SCORE_TYPE.TETRIS
}

function Board(gravity, ghost) {
    this.config(gravity, ghost)

    this.boardTable = nodeListToArray(
        nodeListToArray(
            document.getElementById('board').childNodes
        )[0].childNodes
    )

    this.state = BOARD_STATE.PLAYING
    this.queue = new Queue()
    this.holded = new Figure(document.getElementById('hold'))

    this.scoreDisplay = document.getElementById('score')
    this.scoreList = nodeListToArray(document.getElementById('score-list').childNodes)

    this.init()
}

Board.prototype.init = function () {
    if (this.falling) {
        this.falling.erase(this.board)
        this.falling = null
        this.removeGhost()
    }

    if (this.state == BOARD_STATE.DEAD) {
        this.state = BOARD_STATE.PLAYING
    }

    this.blocks = 0
    this.board = []
    for (var i = 0; i < BOARD_ROW; i++) {
        var row = nodeListToArray(this.boardTable[i].childNodes)
        row.blanks = BOARD_COL
        for (var col = 0; col < BOARD_COL; col++) {
            var td = row[col]
            if (td.blocked) {
                td.className = td.originalClass
                delete td.blocked
            }
            td.originalClass = td.className ? td.className : ''
            td.className = td.className || ''
        }
        this.board.push(row)
    }
    this.leftFrames = 0

    this.holded.setTetrimino(new Tetrimino)
    this.holdSwapped = false

    this.queue.init()
    this.initScore()
}

Board.prototype.config = function (gravity, ghost) {
    if (gravity) {
        this.gravity = gravity
        this.framePerTick = FPS / gravity
        this.das = Math.max(this.framePerTick / 3, MIN_DAS)
        this.leftFrames = this.framePerTick
    }
    this.ghostMode = ghost
    this.updateGhost()
}

Board.prototype.animate = function () {
    if (this.state != BOARD_STATE.PLAYING) {
        return
    }

    this.leftFrames--
    if (this.leftFrames <= 0) {
        this.tick()
        this.leftFrames += this.framePerTick
    }
}

Board.prototype.tick = function () {
    if (this.falling) {
        this.drop()
    }
    if (!this.falling) {
        this.falling = this.queue.shift()
        if (this.falling.isObstructed(this.board, 0, 0, 0)) {
            this.state = BOARD_STATE.DEAD
            return
        }
        if (this.ghostMode) {
            this.removeGhost()
            this.updateGhost()
        }
        this.falling.draw(this.board)
    }
}

Board.prototype.drop = function () {
    if (!this.falling.isObstructed(this.board, 0, 1, 0)) {
        this.falling.erase(this.board)
        this.falling.row++
        this.falling.draw(this.board)
        return true
    }
    this.land()
    return false
}

Board.prototype.land = function () {
    var shape = this.falling.blocks[this.falling.rotation]
    var over = false
    var cleared = []
    for (var i = 0; i < shape.length; i++) {
        var block = shape[i];
        var row = this.falling.row + block.row
        var col = this.falling.col + block.col
        if (--this.board[row].blanks == 0) {
            cleared.push(row)
        }
        var td = this.board[row][col]
        over = over || row < 3
        td.blocked = true
    }
    for (var i = 0; i < cleared.length; i++) {
        for (var row = cleared[i]; row > 0; row--) {
            var rowAbove = this.board[row - 1]
            var clearedRow = this.board[row]
            clearedRow.blanks = rowAbove.blanks
            for (var col = 0; col < BOARD_COL; col++) {
                var tdAbove = rowAbove[col]
                var td = clearedRow[col]
                if (tdAbove.blocked) {
                    td.blocked = tdAbove.blocked
                    delete tdAbove.blocked
                } else {
                    delete td.blocked
                }
                td.className = row == 3 ? td.originalClass : tdAbove.className
                tdAbove.className = tdAbove.originalClass
            }
        }
    }
    if (over) {
        this.state = BOARD_STATE.DEAD
    }
    this.falling = null
    this.holdSwapped = false

    this.addScore(SCORE_TYPE.DROP)
    this.blocks += 4
    if (cleared.length) {
        this.blocks -= cleared.length * BOARD_COL
        var scoreData = LINE_SCORE[cleared.length]
        scoreData.score *= this.gravity
        var score = this.addScore(scoreData)
        if (!this.combo) {
            this.combo = {
                score: score,
                description: SCORE_TYPE.COMBO.description
            }
        } else {
            this.addScore(this.combo)
            this.combo.score += score
        }
        if (this.blocks == 0) {
            var scoreData = SCORE_TYPE.PERFECT_CLEAR
            scoreData.score *= this.gravity
            this.addScore(SCORE_TYPE.PERFECT_CLEAR)
        }
    } else {
        this.combo = null
    }
}

Board.prototype.initScore = function () {
    this.score = 0
    this.scoreDisplay.textContent = 0
    for (var i = 0; i < this.scoreList.length; i++) {
        var li = this.scoreList[i];
        li.className = ''
        li.textContent = ''
    }
    this.combo = null
}

Board.prototype.addScore = function (scoreData) {
    if (scoreData.score) {
        this.score += scoreData.score
        this.scoreDisplay.textContent = this.score
    }
    if (scoreData.description) {
        for (var i = this.scoreList.length - 1; i > 0; i--) {
            var liAbove = this.scoreList[i - 1]
            var li = this.scoreList[i]

            li.className = liAbove.className
            li.textContent = liAbove.textContent
        }
        var li = this.scoreList[0]
        li.textContent = scoreData.description + scoreData.score
        li.className = scoreData.type ? scoreData.type : ''
    }
    return scoreData.score
}

Board.prototype.removeGhost = function () {
    if (this.ghost) {
        this.ghost.erase(this.board)
        this.ghost = null
    }
}

Board.prototype.updateGhost = function () {
    if (!this.ghostMode) {
        this.removeGhost()
        return
    }
    if (!this.falling) {
        return
    }
    if (!this.ghost) {
        this.ghost = new this.falling.constructor
        this.ghost.type = GHOST
    }
    this.ghost.erase(this.board)
    this.ghost.row = this.falling.row
    this.ghost.col = this.falling.col
    this.ghost.rotation = this.falling.rotation
    while (!this.ghost.isObstructed(this.board, 0, 1, 0)) {
        this.ghost.row++
    }
    this.ghost.draw(this.board)
}

Board.prototype.softDrop = function () {
    if (!this.falling.isObstructed(this.board, 0, 1, 0)) {
        this.falling.erase(this.board)
        this.falling.row++
        this.falling.draw(this.board)
        this.leftFrames = this.framePerTick
    }
}

Board.prototype.hardDrop = function () {
    var isMovable = !this.falling.isObstructed(this.board, 0, 1, 0)
    if (isMovable) {
        var height = 0
        this.falling.erase(this.board)
        do {
            height++
            this.falling.row++
        } while (!this.falling.isObstructed(this.board, 0, 1, 0))
        this.falling.draw(this.board)
        this.addScore({ score: height })
    }
    this.land()
    this.leftFrames = 0
}

Board.prototype.move = function (delta) {
    if (!this.falling.isObstructed(this.board, 0, 0, delta)) {
        this.falling.erase(this.board)
        this.falling.col += delta
        this.updateGhost()
        this.falling.draw(this.board)
    }
}

Board.prototype.rotate = function (delta) {
    this.falling.erase(this.board)
    this.falling.rotate(this.board, delta)
    this.updateGhost()
    this.falling.draw(this.board)
}

Board.prototype.hold = function () {
    if (this.holdSwapped) {
        return
    }
    this.falling.erase(this.board)
    var falling = this.falling
    if (this.holded.tetrimino.type != GHOST) {
        this.falling = new this.holded.tetrimino.constructor
        this.falling.draw(this.board)
        this.removeGhost()
        this.updateGhost()
        this.leftFrames = this.framePerTick
    } else {
        this.falling = null
        this.leftFrames = 0
    }
    this.holded.setTetrimino(falling)
    this.holdSwapped = true
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Queue
///////////////////////////////////////////////////////////////////////////////////////////////////

function openSevenBag() {
    var bag = [
        new IMino,
        new JMino,
        new LMino,
        new OMino,
        new SMino,
        new TMino,
        new ZMino
    ]
    bag.choice = function () {
        var i = Math.floor(Math.random() * bag.length)
        var choosen = bag[i]
        bag.splice(i, 1)
        return choosen
    }
    return bag
}

function Queue() {
    this.queueTables = nodeListToArray(document.getElementById('queue').childNodes)
    this.init()
}

Queue.prototype.init = function () {
    this.bag = openSevenBag()
    this.queue = []
    for (var i = 0; i < this.queueTables.length; i++) {
        this.queue[i] = new Figure(this.queueTables[i], this.bag.choice())
        if (this.bag.length == 0) {
            this.bag = openSevenBag()
        }
    }
}

Queue.prototype.shift = function () {
    var tetrimino = this.queue[0].tetrimino
    for (var i = 0; i < this.queue.length - 1; i++) {
        this.queue[i].setTetrimino(this.queue[i + 1].tetrimino)
    }
    this.queue[this.queue.length - 1].setTetrimino(this.bag.choice())
    if (this.bag.length == 0) {
        this.bag = openSevenBag()
    }
    return tetrimino
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Figure
///////////////////////////////////////////////////////////////////////////////////////////////////

function Figure(table, tetrimino) {
    var trs = nodeListToArray(nodeListToArray(table.childNodes)[0].childNodes)
    this.table = []
    for (var i = 0; i < trs.length; i++) {
        var row = nodeListToArray(trs[i].childNodes)
        for (var j = 0; j < row.length; j++) {
            var td = row[j]
            td.originalClass = 'hidden'
            td.className = 'hidden'
        }
        this.table.push(row)
    }
    if (tetrimino) {
        this.setTetrimino(tetrimino)
    }
}

Figure.prototype.setTetrimino = function (tetrimino) {
    if (this.tetrimino) {
        var shape = this.tetrimino.blocks[0]
        for (var i = 0; i < shape.length; i++) {
            var block = shape[i];
            var td = this.table[block.row][block.col]
            td.className = td.originalClass
        }
    }
    var shape = tetrimino.blocks[0]
    for (var i = 0; i < shape.length; i++) {
        var block = shape[i];
        var td = this.table[block.row][block.col]
        td.className = tetrimino.type
    }
    this.tetrimino = tetrimino
    return this
}


///////////////////////////////////////////////////////////////////////////////////////////////////
// Base Tetrimino
///////////////////////////////////////////////////////////////////////////////////////////////////

function block(row, col) {
    return { row: row, col: col }
}

function isInBoard(row, col) {
    return row >= 0 && row < BOARD_ROW && col >= 0 && col < BOARD_COL
}
function Tetrimino(row, col) {
    this.row = row
    this.col = col
    this.rotation = 0
}

var GHOST = 'ghost'
Tetrimino.prototype.type = GHOST
Tetrimino.prototype.blocks = [[block(1, 0), block(0, 1), block(1, 2), block(0, 3)]]
Tetrimino.prototype.kicks = [
    {   // from 0
        '1': [block(0, -1), block(-1, -1), block(2, 0), block(2, -1)],
        '-1': [block(0, 1), block(-1, 1), block(2, 0), block(2, 1)]
    }, {// from 1
        '1': [block(0, 1), block(1, 1), block(-2, 0), block(-2, 1)],
        '-1': [block(0, 1), block(1, 1), block(-2, 0), block(-2, 1)]
    }, {// from 2
        '1': [block(0, 1), block(1, 1), block(2, 0), block(2, 1)],
        '-1': [block(0, -1), block(-1, -1), block(2, 0), block(2, -1)]
    }, {// from 3
        '1': [block(0, -1), block(1, -1), block(-2, 0), block(-2, -1)],
        '-1': [block(0, -1), block(1, -1), block(-2, 0), block(-2, -1)]
    }
]

Tetrimino.prototype.isObstructed = function (board, rotationOffset, rowOffset, colOffset) {
    var maxRotation = this.blocks.length
    var rotation = ((this.rotation + rotationOffset) % maxRotation + maxRotation) % maxRotation
    var shape = this.blocks[rotation]
    for (var i = 0; i < shape.length; i++) {
        var block = shape[i];
        var row = this.row + block.row + rowOffset
        var col = this.col + block.col + colOffset
        if (!isInBoard(row, col) || board[row][col].blocked) {
            return true
        }
    }
    return false
}

Tetrimino.prototype.rotate = function (board, delta) {
    var failed = this.isObstructed(board, delta, 0, 0)
    if (failed && this.kicks[this.rotation]) {
        var kicks = this.kicks[this.rotation][delta]
        for (var i = 0; i < kicks.length; i++) {
            var kick = kicks[i];
            if (!this.isObstructed(board, delta, kick.row, kick.col)) {
                this.row += kick.row
                this.col += kick.col
                failed = false
                break
            }
        }
    }
    if (!failed) {
        var maxRotation = this.blocks.length
        this.rotation = ((this.rotation + delta) % maxRotation + maxRotation) % maxRotation
    }
}

Tetrimino.prototype.draw = function (board) {
    var shape = this.blocks[this.rotation]
    for (var i = 0; i < shape.length; i++) {
        var block = shape[i];
        var row = this.row + block.row
        var col = this.col + block.col
        var td = board[row][col]
        if (td.className != this.type) {
            td.className = this.type
        }
    }
}

Tetrimino.prototype.erase = function (board) {
    var shape = this.blocks[this.rotation]
    for (var i = 0; i < shape.length; i++) {
        var block = shape[i];
        var row = this.row + block.row
        var col = this.col + block.col
        var td = board[row][col]
        if (td.className == this.type) {
            td.className = td.originalClass
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Tetriminos
///////////////////////////////////////////////////////////////////////////////////////////////////

function IMino() { }
IMino.prototype = new Tetrimino(0, 3)
IMino.prototype.constructor = IMino
IMino.prototype.type = 'i'
IMino.prototype.blocks = [
    [block(1, 0), block(1, 1), block(1, 2), block(1, 3)],
    [block(0, 2), block(1, 2), block(2, 2), block(3, 2)],
    [block(2, 0), block(2, 1), block(2, 2), block(2, 3)],
    [block(0, 1), block(1, 1), block(2, 1), block(3, 1)]
]
IMino.prototype.kicks = [
    {   // from 0
        '1': [block(0, 1), block(-1, 1), block(2, 0), block(2, 1)],
        '-1': [block(0, -1), block(0, 2), block(-2, -1), block(-1, 2)]
    }, {// from 1
        '1': [block(0, -1), block(0, 2), block(-2, -1), block(1, 2)],
        '-1': [block(0, 2), block(0, -1), block(-1, 2), block(2, -1)]
    }, {// from 2
        '1': [block(0, 2), block(0, -1), block(-1, 2), block(2, -1)],
        '-1': [block(0, 1), block(0, -2), block(2, 1), block(-1, -2)]
    }, {// from 3
        '1': [block(0, 1), block(0, -2), block(2, 1), block(-1, -2)],
        '-1': [block(0, -2), block(0, 1), block(1, -2), block(-2, 1)]
    }
]

function JMino() { }
JMino.prototype = new Tetrimino(0, 3)
JMino.prototype.constructor = JMino
JMino.prototype.type = 'j'
JMino.prototype.blocks = [
    [block(0, 0), block(1, 0), block(1, 1), block(1, 2)],
    [block(0, 1), block(0, 2), block(1, 1), block(2, 1)],
    [block(1, 0), block(1, 1), block(1, 2), block(2, 2)],
    [block(0, 1), block(1, 1), block(2, 0), block(2, 1)]
]

function LMino() { }
LMino.prototype = new Tetrimino(0, 3)
LMino.prototype.constructor = LMino
LMino.prototype.type = 'l'
LMino.prototype.blocks = [
    [block(0, 2), block(1, 0), block(1, 1), block(1, 2)],
    [block(0, 1), block(1, 1), block(2, 1), block(2, 2)],
    [block(1, 0), block(1, 1), block(1, 2), block(2, 0)],
    [block(0, 0), block(0, 1), block(1, 1), block(2, 1)]
]
function OMino() { }
OMino.prototype = new Tetrimino(0, 4)
OMino.prototype.constructor = OMino
OMino.prototype.type = 'o'
OMino.prototype.blocks = [[block(0, 0), block(0, 1), block(1, 0), block(1, 1)]]
OMino.prototype.kicks = []

function SMino() { }
SMino.prototype = new Tetrimino(0, 3)
SMino.prototype.constructor = SMino
SMino.prototype.type = 's'
SMino.prototype.blocks = [
    [block(0, 1), block(0, 2), block(1, 0), block(1, 1)],
    [block(0, 1), block(1, 1), block(1, 2), block(2, 2)],
    [block(1, 1), block(1, 2), block(2, 0), block(2, 1)],
    [block(0, 0), block(1, 0), block(1, 1), block(2, 1)]
]

function TMino() { }
TMino.prototype = new Tetrimino(0, 3)
TMino.prototype.constructor = TMino
TMino.prototype.type = 't'
TMino.prototype.blocks = [
    [block(0, 1), block(1, 0), block(1, 1), block(1, 2)],
    [block(0, 1), block(1, 1), block(1, 2), block(2, 1)],
    [block(1, 0), block(1, 1), block(1, 2), block(2, 1)],
    [block(0, 1), block(1, 0), block(1, 1), block(2, 1)]
]

function ZMino() { }
ZMino.prototype = new Tetrimino(0, 3)
ZMino.prototype.constructor = ZMino
ZMino.prototype.type = 'z'
ZMino.prototype.blocks = [
    [block(0, 0), block(0, 1), block(1, 1), block(1, 2)],
    [block(0, 2), block(1, 1), block(1, 2), block(2, 1)],
    [block(1, 0), block(1, 1), block(2, 1), block(2, 2)],
    [block(0, 1), block(1, 0), block(1, 1), block(2, 0)]
]