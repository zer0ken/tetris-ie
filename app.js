function isElement(obj) {
    try {
        return obj instanceof HTMLElement;
    }
    catch (e) {
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

function setTextContent(el, text) {
    if (el.textContent) {
        el.textContent = text
    } else {
        el.innerHTML = ''
        el.appendChild(
            document.createTextNode(text)
        )
    }
}

function getTextContent(el) {
    if (el.textContent) {
        return el.textContent
    }
    return el.innerText
}

(function () {
    // console.log
    var alertFallback = true;
    if (typeof console === "undefined" || typeof console.log === "undefined") {
        console = {};
        if (alertFallback) {
            console.log = function (msg) {
                alert(msg);
            };
        } else {
            console.log = function () { };
        }
    }

    // Function.prototype.bind
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

    // window.addEventListener
    if (!window.addEventListener && window.attachEvent) {
        window.addEventListener = function (eventName, callback) {
            document.attachEvent('on' + eventName, callback)
        }
    }

    // window.requestAnimationFrame
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (callback) {
            setTimeout(callback, 1000 / FPS)
        }
    }

    // Object.keys
    if (!Object.keys) {
        Object.keys = function (obj) {
            var keys = [];

            for (var i in obj) {
                if (obj.hasOwnProperty(i)) {
                    keys.push(i);
                }
            }

            return keys;
        };
    }
})()

///////////////////////////////////////////////////////////////////////////////////////////////////
// App
///////////////////////////////////////////////////////////////////////////////////////////////////

window.onload = function () {
    new App
}

var CONTROLS = {
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    ROTATE_RIGHT: 'rotateRight',
    ROTATE_LEFT: 'rotateLeft',
    SOFT_DROP: 'softDrop',
    HARD_DROP: 'hardDrop',
    HOLD: 'hold',
    PAUSE: 'pause',
    RESET: 'reset',
    STATISTICS: 'statistics'
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
    81: CONTROLS.PAUSE,
    82: CONTROLS.RESET,
    83: CONTROLS.STATISTICS
}

var BUTTON_STATE = {
    ON: 'button on',
    OFF: 'button off'
}

var DAY_NIGHT = {
    DAY: '☀',
    NIGHT: '★'
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

    this.statisticsBTN = document.getElementById('statistics')
    this.statisticsBTN.onclick = this.openStatistics.bind(this)

    this.gravityBTN = document.getElementById('gravity')
    this.gravityBTN.onclick = this.setGravity.bind(this)
    this.gravityDisplay = document.getElementById('gravity-value')

    this.ghostBTN = document.getElementById('ghost')
    this.ghostBTN.onclick = this.toggleGhost.bind(this)
    this.ghostDisplay = document.getElementById('ghost-value')

    this.dayBTN = document.getElementById('day')
    this.dayBTN.onclick = this.toggleDayMode.bind(this)
    this.dayDisplay = document.getElementById('day-value')

    this.pressing = {}
}

App.prototype.focus = function () {
    if (!document.hasFocus()) {
        window.focus()
    }
}

App.prototype.animate = function () {
    window.requestAnimationFrame(this.animate.bind(this))
    this.board.animate()

    if (this.board.state == BOARD_STATE.PLAYING) {
        if (!document.hasFocus()) {
            this.togglePause()
            return
        }
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
            e.preventDefault ? e.preventDefault() : (e.returnValue = false)
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
        case CONTROLS.STATISTICS:
            this.pressing = {}
            this.openStatistics()
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
    this.focus()
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
    this.focus()
    if (gravity != NaN && gravity >= 1 && gravity <= 20) {
        this.gravity = gravity
        this.board.config(gravity, this.ghost)
        setTextContent(this.gravityDisplay, gravity)
    }
}

App.prototype.toggleGhost = function () {
    if (this.board.state == BOARD_STATE.PLAYING) {
        this.togglePause()
    }
    this.ghost = !this.ghost
    setTextContent(this.ghostDisplay, this.ghost ? 'ON' : 'OFF')
    this.board.config(this.gravity, this.ghost)
}

App.prototype.openStatistics = function () {
    if (this.board.state == BOARD_STATE.PLAYING) {
        this.togglePause()
    }
    alert(this.board.statistics.toString())
    this.focus()
}

App.prototype.toggleDayMode = function () {
    if (this.board.state == BOARD_STATE.PLAYING) {
        this.togglePause()
    }
    if (document.body.className) {
        document.body.className = ''
        setTextContent(this.dayDisplay, DAY_NIGHT.NIGHT)
    } else {
        document.body.className = 'day'
        setTextContent(this.dayDisplay, DAY_NIGHT.DAY)
    }
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
    DROP: 'Drop',
    LAND: 'Land',
    SINGLE_LINE: 'Single Line',
    DOUBLE_LINE: 'Double Line',
    TRIPLE_LINE: 'Triple Line',
    TETRIS: 'Tetris',
    T_SPIN_MINI_ZERO: 'T-Spin Mini Zero',
    T_SPIN_ZERO: 'T-Spin Zero',
    T_SPIN_MINI_SINGLE: 'T-Spin Mini Single',
    T_SPIN_SINGLE: 'T-Spin Single',
    T_SPIN_MINI_DOUBLE: 'T-Spin Mini Double',
    T_SPIN_DOUBLE: 'T-Spin Double',
    T_SPIN_TRIPLE: 'T-Spin Triple',
    PERFECT_CLEAR_SINGLE: 'Perfect Clear Single',
    PERFECT_CLEAR_DOUBLE: 'Perfect Clear Double',
    PERFECT_CLEAR_TRIPLE: 'Perfect Clear Triple',
    PERFECT_CLEAR_TETRIS: 'Perfect Clear Tetris',
    PERFECT_CLEAR_BACK_TO_BACK: 'Perfect Clear Back-to-Back',
    COMBO: 'Combo',
    BACK_TO_BACK: 'Back-to-Back'
}

var SCORE_OBJECT = {
    DROP: function (height) {
        return { type: SCORE_TYPE.DROP, score: height }
    },
    LAND: function () {
        return { type: SCORE_TYPE.LAND, score: 4 }
    },
    SINGLE_LINE: function () {
        return {
            type: SCORE_TYPE.SINGLE_LINE,
            score: 100,
            description: function () { return 'SINGLE +' + this.score }
        }
    },
    DOUBLE_LINE: function () {
        return {
            type: SCORE_TYPE.DOUBLE_LINE,
            score: 300,
            description: function () { return 'DOUBLE +' + this.score }
        }
    },
    TRIPLE_LINE: function () {
        return {
            type: SCORE_TYPE.TRIPLE_LINE,
            score: 500,
            description: function () { return 'TRIPLE +' + this.score }
        }
    },
    T_SPIN_MINI_ZERO: function () {
        return {
            type: SCORE_TYPE.T_SPIN_MINI_ZERO,
            score: 100,
            description: function () { return 'T SPIN MINI ZERO +' + this.score }
        }
    },
    T_SPIN_ZERO: function () {
        return {
            type: SCORE_TYPE.T_SPIN_ZERO,
            score: 400,
            description: function () { return 'T SPIN ZERO +' + this.score }
        }
    },
    T_SPIN_MINI_SINGLE: function () {
        return {
            type: SCORE_TYPE.T_SPIN_MINI_SINGLE,
            score: 200,
            tier: 'silver',
            description: function () { return 'T SPIN MINI SINGLE +' + this.score }
        }
    },
    T_SPIN_SINGLE: function () {
        return {
            type: SCORE_TYPE.T_SPIN_SINGLE,
            score: 800,
            tier: 'gold',
            description: function () { return 'T SPIN SINGLE +' + this.score }
        }
    },
    T_SPIN_MINI_DOUBLE: function () {
        return {
            type: SCORE_TYPE.T_SPIN_MINI_DOUBLE,
            score: 400,
            tier: 'silver',
            description: function () { return 'T SPIN MINI DOUBLE +' + this.score }
        }
    },
    T_SPIN_DOUBLE: function () {
        return {
            type: SCORE_TYPE.T_SPIN_DOUBLE,
            score: 1200,
            tier: 'gold',
            description: function () { return 'T SPIN DOUBLE +' + this.score }
        }
    },
    T_SPIN_TRIPLE: function () {
        return {
            type: SCORE_TYPE.T_SPIN_TRIPLE,
            score: 1600,
            tier: 'gold',
            description: function () { return 'T SPIN TRIPLE +' + this.score }
        }
    },
    TETRIS: function () {
        return {
            type: SCORE_TYPE.TETRIS,
            score: 800,
            tier: 'gold',
            description: function () { return 'TETRIS +' + this.score }
        }
    },
    PERFECT_CLEAR_SINGLE: function () {
        return {
            type: SCORE_TYPE.PERFECT_CLEAR_SINGLE,
            score: 800,
            tier: 'aqua',
            description: function () { return 'PERFECT CLEAR SINGLE +' + this.score }
        }
    },
    PERFECT_CLEAR_DOUBLE: function () {
        return {
            type: SCORE_TYPE.PERFECT_CLEAR_DOUBLE,
            score: 1200,
            tier: 'aqua',
            description: function () { return 'PERFECT CLEAR DOUBLE +' + this.score }
        }
    },
    PERFECT_CLEAR_TRIPLE: function () {
        return {
            type: SCORE_TYPE.PERFECT_CLEAR_TRIPLE,
            score: 1800,
            tier: 'aqua',
            description: function () { return 'PERFECT CLEAR TRIPLE +' + this.score }
        }
    },
    PERFECT_CLEAR_TETRIS: function () {
        return {
            type: SCORE_TYPE.PERFECT_CLEAR_TETRIS,
            score: 2000,
            tier: 'aqua',
            description: function () { return 'PERFECT CLEAR TETRIS +' + this.score }
        }
    },
    PERFECT_CLEAR_BACK_TO_BACK: function () {
        return {
            type: SCORE_TYPE.PERFECT_CLEAR_BACK_TO_BACK,
            score: 3200,
            tier: 'aqua',
            description: function () { return 'PERFECT CLEAR BACK-TO-BACK +' + this.score }
        }
    },
    COMBO: function (lastCombo) {
        return {
            type: SCORE_TYPE.COMBO,
            score: 50 * lastCombo,
            tier: 'silver',
            description: function () { return 'COMBO ×' + lastCombo + ' +' + this.score }
        }
    },
    BACK_TO_BACK: function (score) {
        return {
            type: SCORE_TYPE.BACK_TO_BACK,
            score: score / 2,
            tier: 'silver',
            description: function () { return 'BACK-TO-BACK +' + this.score }
        }
    }
}

var LINE_SCORE = {
    1: SCORE_OBJECT.SINGLE_LINE,
    2: SCORE_OBJECT.DOUBLE_LINE,
    3: SCORE_OBJECT.TRIPLE_LINE,
    4: SCORE_OBJECT.TETRIS
}

var T_SPIN_SCORE = {
    0: SCORE_OBJECT.T_SPIN_ZERO,
    1: SCORE_OBJECT.T_SPIN_SINGLE,
    2: SCORE_OBJECT.T_SPIN_DOUBLE,
    3: SCORE_OBJECT.T_SPIN_TRIPLE
}

var T_SPIN_MINI_SCORE = {
    0: SCORE_OBJECT.T_SPIN_MINI_ZERO,
    1: SCORE_OBJECT.T_SPIN_MINI_SINGLE,
    2: SCORE_OBJECT.T_SPIN_MINI_DOUBLE
}

var PERFECT_CLEAR_SCORE = {
    1: SCORE_OBJECT.PERFECT_CLEAR_SINGLE,
    2: SCORE_OBJECT.PERFECT_CLEAR_DOUBLE,
    3: SCORE_OBJECT.PERFECT_CLEAR_TRIPLE,
    4: SCORE_OBJECT.PERFECT_CLEAR_TETRIS
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

    this.kicked = false
    this.scoreDisplay = document.getElementById('score')
    this.scoreList = nodeListToArray(document.getElementById('score-list').childNodes)

    this.statistics = new Statistics

    this.init()
}

Board.prototype.init = function () {
    if (this.falling) {
        this.falling.erase(this.board)
        this.falling = false
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
                td.blocked = false
            }
            td.originalClass = td.className ? td.className : ''
            td.className = td.className || ''
        }
        this.board.push(row)
    }
    this.leftFrames = 0

    this.queue.init()

    this.holded.setTetrimino(new Tetrimino)
    this.holdSwapped = false

    this.kicked = false
    this.backToBack = false
    this.initScore()
    this.statistics.init()
}

Board.prototype.config = function (gravity, ghost) {
    if (gravity) {
        this.gravity = gravity
        this.framePerTick = FPS / (.5 + gravity / 2)
        this.das = Math.max(this.framePerTick / 5, MIN_DAS)
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
        this.kicked = false
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
        this.kicked = false
    } else {
        this.land()
    }
}

Board.prototype.land = function () {
    var shape = this.falling.blocks[this.falling.rotation]
    var over = false
    var isTSpin = false
    if (this.falling.isTSpin) {
        var isTSpin = this.falling.isTSpin(this.board)
        if (!this.kicked) {
            isTSpin = T_SPIN_STATE.NOT_T_SPIN
        } else if (isTSpin == T_SPIN_STATE.T_SPIN_MINI
            && Math.abs(this.kicked.row) + Math.abs(this.kicked.col) >= 3) {
            isTSpin = T_SPIN_STATE.T_SPIN
        }
    }
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
                    tdAbove.blocked = false
                } else {
                    td.blocked = false
                }
                td.className = row == 3 ? td.originalClass : tdAbove.className
                tdAbove.className = tdAbove.originalClass
            }
        }
    }
    if (over) {
        this.state = BOARD_STATE.DEAD
    }
    this.holdSwapped = false

    // land score
    this.addScore(SCORE_OBJECT.LAND())
    this.blocks += 4
    if (cleared.length || isTSpin) {
        var primaryScore
        if (isTSpin) {
            // t-spin score
            var scoreList = isTSpin == T_SPIN_STATE.T_SPIN_MINI
                ? T_SPIN_MINI_SCORE
                : T_SPIN_SCORE
            primaryScore = scoreList[cleared.length]()
            primaryScore.score *= this.gravity
            this.addScore(primaryScore)
        } else {
            // clear score
            this.blocks -= cleared.length * BOARD_COL
            primaryScore = LINE_SCORE[cleared.length]()
            primaryScore.score *= this.gravity
            this.addScore(primaryScore)
        }
        // combo score
        if (cleared.length && this.combo) {
            var comboScore = SCORE_OBJECT.COMBO(this.combo)
            comboScore.score *= this.gravity
            this.addScore(comboScore)
            this.combo++
        } else {
            this.combo = 1
        }

        // perfect clear score
        if (this.blocks == 0) {
            var perfectClearScore = primaryScore.type == SCORE_TYPE.TETRIS
                ? SCORE_OBJECT.PERFECT_CLEAR_BACK_TO_BACK
                : PERFECT_CLEAR_SCORE[cleared.length]
            perfectClearScore.score *= this.gravity
            this.addScore(perfectClearScore)
        }

        // back-to-back score
        if (cleared.length >= 4 || (isTSpin && cleared.length >= 1)) {
            if (this.backToBack) {
                this.addScore(SCORE_OBJECT.BACK_TO_BACK(primaryScore.score))
            }
            this.backToBack = true
        } else if (cleared.length) {
            this.backToBack = false
        }
    } else {
        this.combo = 0
    }
    this.falling = null
}

Board.prototype.initScore = function () {
    this.score = 0
    setTextContent(this.scoreDisplay, 0)
    for (var i = 0; i < this.scoreList.length; i++) {
        var li = this.scoreList[i];
        li.className = ''
        setTextContent(li, '')
    }
    this.combo = SCORE_OBJECT.COMBO()
}

Board.prototype.addScore = function (scoreData) {
    this.statistics.collect(scoreData)
    if (scoreData.score) {
        this.score += scoreData.score
        setTextContent(this.scoreDisplay, this.score)
    }
    if (scoreData.description) {
        var description = scoreData.description()
        for (var i = this.scoreList.length - 1; i > 0; i--) {
            var liAbove = this.scoreList[i - 1]
            var li = this.scoreList[i]

            li.className = liAbove.className
            setTextContent(li, getTextContent(liAbove))
        }
        var li = this.scoreList[0]
        setTextContent(li, description)
        li.className = scoreData.tier ? scoreData.tier : ''
    }
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
        this.kicked = false
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
        this.addScore(SCORE_OBJECT.DROP(height))
        this.kicked = false
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
        this.kicked = false
    }
}

Board.prototype.rotate = function (delta) {
    this.falling.erase(this.board)
    var rotated = this.falling.rotate(this.board, delta)
    console.log(rotated)
    if (rotated) {
        this.updateGhost()
        this.kicked = rotated
    }
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
    this.kicked = false
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Statistics
///////////////////////////////////////////////////////////////////////////////////////////////////

function Statistics() {
    this.init()
}

Statistics.prototype.init = function () {
    // land score
    this.height = 0
    this.landed = 0

    // clear score
    this.cleared = 0
    this.single = 0
    this.double = 0
    this.triple = 0
    this.tetris = 0
    this.tSpinMiniZero = 0
    this.tSpinMiniSingle = 0
    this.tSpinMiniDouble = 0
    this.tSpinZero = 0
    this.tSpinSingle = 0
    this.tSpinDouble = 0
    this.tSpinTriple = 0
    this.tSpinTripleMini = 0
    this.perfectClearSingle = 0
    this.perfectClearDouble = 0
    this.perfectClearTriple = 0
    this.perfectClearTetris = 0

    // combo score
    this.maxCombo = 0
    this.comboScore = 0
}

Statistics.prototype.collect = function (scoreData) {
    var type = scoreData.type
    if (type == SCORE_TYPE.LAND) {
        this.landed++
    } else if (type == SCORE_TYPE.DROP) {
        this.height += scoreData.score
    } else if (type == SCORE_TYPE.SINGLE_LINE) {
        this.cleared += 1
        this.single++
    } else if (type == SCORE_TYPE.DOUBLE_LINE) {
        this.cleared += 2
        this.double++
    } else if (type == SCORE_TYPE.TRIPLE_LINE) {
        this.cleared += 3
        this.triple++
    } else if (type == SCORE_TYPE.TETRIS) {
        this.cleared += 4
        this.tetris++
    } else if (type == SCORE_TYPE.T_SPIN_SINGLE) {
        this.cleared += 1
        this.tSpinSingle++
    } else if (type == SCORE_TYPE.T_SPIN_DOUBLE) {
        this.cleared += 2
        this.tSpinDouble++
    } else if (type == SCORE_TYPE.T_SPIN_TRIPLE) {
        this.cleared += 3
        this.tSpinTriple++
    } else if (type == SCORE_TYPE.PERFECT_CLEAR) {
        this.perfectClear++
    } else if (type == SCORE_TYPE.COMBO) {
        this.maxCombo = Math.max(this.maxCombo, scoreData.count)
        this.comboScore += scoreData.score
    }
}

Statistics.prototype.toString = function () {
    return 'fixing...'
    // return ('[ 하강 기록 ]'
    //     + '\n  * 하강 개수:  ' + this.landed + ' 개'
    //     + '\n  * 하드 드랍한 높이:  ' + this.height + ' 블럭'
    //     + '\n\n[ 제거 기록 ]'
    //     + '\n  * 제거한 줄:  ' + this.cleared + ' 줄'
    //     + '\n\n  * Single:  ' + this.single + ' 회 / T-Spin:  ' + this.tSpinSingle + ' 회'
    //     + '\n  * Double:  ' + this.double + ' 회 / T-Spin:  ' + this.tSpinDouble + ' 회'
    //     + '\n  * Triple:  ' + this.triple + ' 회 / T-Spin:  ' + this.tSpinTriple + ' 회'
    //     + '\n  * Tetris:  ' + this.tetris + ' 회'
    //     + '\n\n  * 퍼펙트 클리어:  ' + this.perfectClear + ' 회'
    //     + '\n\n[ 연쇄 기록 ]'
    //     + '\n  * 최장 연쇄 횟수:  ' + this.maxCombo + ' 회'
    //     + '\n  * 총 연쇄 점수:  ' + this.comboScore + ' 점')
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
Tetrimino.prototype.blocks = [[block(1, 0), block(0, 1), block(1, 2), block(0, 3)]] // 10 01 12 03
Tetrimino.prototype.kicks = [
    {   // from 0
        '1': [block(0, -1), block(-1, -1), block(2, 0), block(2, -1)],  // 0-1 -1-1 20 2-1  (a)
        '-1': [block(0, 1), block(-1, 1), block(2, 0), block(2, 1)]     // 01 -11 20 21
    }, {// from 1
        '1': [block(0, 1), block(1, 1), block(-2, 0), block(-2, 1)],    // 01 11 -20 -21    (b)
        '-1': [block(0, 1), block(1, 1), block(-2, 0), block(-2, 1)]    // 01 11 -20 -21    (b)
    }, {// from 2
        '1': [block(0, 1), block(1, 1), block(2, 0), block(2, 1)],      // 01 11 20 21
        '-1': [block(0, -1), block(-1, -1), block(2, 0), block(2, -1)]  // 0-1 -1-1 20 2-1  (a)
    }, {// from 3
        '1': [block(0, -1), block(1, -1), block(-2, 0), block(-2, -1)], // 0-1 1-1 -20 -2-1 (c)
        '-1': [block(0, -1), block(1, -1), block(-2, 0), block(-2, -1)] // 0-1 1-1 -20 -2-1 (c)
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
    var kick = block(0, 0)
    if (failed && this.kicks[this.rotation]) {
        var kicks = this.kicks[this.rotation][delta]
        for (var i = 0; i < kicks.length; i++) {
            kick = kicks[i];
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
    return !failed && kick
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
    [block(1, 0), block(1, 1), block(1, 2), block(1, 3)],   // 10 11 12 13
    [block(0, 2), block(1, 2), block(2, 2), block(3, 2)],   // 02 12 22 32
    [block(2, 0), block(2, 1), block(2, 2), block(2, 3)],   // 20 21 22 23
    [block(0, 1), block(1, 1), block(2, 1), block(3, 1)]    // 01 11 21 31
]
IMino.prototype.kicks = [
    {   // from 0
        '1': [block(0, 1), block(-1, 1), block(2, 0), block(2, 1)],     // 01 -11 20 21
        '-1': [block(0, -1), block(0, 2), block(-2, -1), block(-1, 2)]  // 0-1 02 -2-1 -12
    }, {// from 1
        '1': [block(0, -1), block(0, 2), block(-2, -1), block(1, 2)],   // 0-1 02 -2-1 12
        '-1': [block(0, 2), block(0, -1), block(-1, 2), block(2, -1)]   // 02 0-1 -12 2-1   (a)
    }, {// from 2
        '1': [block(0, 2), block(0, -1), block(-1, 2), block(2, -1)],   // 02 0-1 -12 2-1   (a)
        '-1': [block(0, 1), block(0, -2), block(2, 1), block(-1, -2)]   // 01 0-2 21 -1-2   (b)
    }, {// from 3
        '1': [block(0, 1), block(0, -2), block(2, 1), block(-1, -2)],   // 01 0-2 21 -1-2   (b)
        '-1': [block(0, -2), block(0, 1), block(1, -2), block(-2, 1)]   // 0-2 01 1-2 -21
    }
]

function JMino() { }
JMino.prototype = new Tetrimino(0, 3)
JMino.prototype.constructor = JMino
JMino.prototype.type = 'j'
JMino.prototype.blocks = [
    [block(0, 0), block(1, 0), block(1, 1), block(1, 2)],   // 00 10 11 12
    [block(0, 1), block(0, 2), block(1, 1), block(2, 1)],   // 01 02 11 21
    [block(1, 0), block(1, 1), block(1, 2), block(2, 2)],   // 10 11 12 22
    [block(0, 1), block(1, 1), block(2, 0), block(2, 1)]    // 01 11 20 21
]

function LMino() { }
LMino.prototype = new Tetrimino(0, 3)
LMino.prototype.constructor = LMino
LMino.prototype.type = 'l'
LMino.prototype.blocks = [
    [block(0, 2), block(1, 0), block(1, 1), block(1, 2)],   // 02 10 11 12
    [block(0, 1), block(1, 1), block(2, 1), block(2, 2)],   // 01 11 21 22
    [block(1, 0), block(1, 1), block(1, 2), block(2, 0)],   // 01 11 12 20
    [block(0, 0), block(0, 1), block(1, 1), block(2, 1)]    // 00 01 11 21
]
function OMino() { }
OMino.prototype = new Tetrimino(0, 4)
OMino.prototype.constructor = OMino
OMino.prototype.type = 'o'
OMino.prototype.blocks = [[block(0, 0), block(0, 1), block(1, 0), block(1, 1)]] // 00 01 10 11
OMino.prototype.kicks = []

function SMino() { }
SMino.prototype = new Tetrimino(0, 3)
SMino.prototype.constructor = SMino
SMino.prototype.type = 's'
SMino.prototype.blocks = [
    [block(0, 1), block(0, 2), block(1, 0), block(1, 1)],   // 01 02 10 11
    [block(0, 1), block(1, 1), block(1, 2), block(2, 2)],   // 01 11 12 22
    [block(1, 1), block(1, 2), block(2, 0), block(2, 1)],   // 11 12 20 21
    [block(0, 0), block(1, 0), block(1, 1), block(2, 1)]    // 00 10 11 21
]

function TMino() { }
TMino.prototype = new Tetrimino(0, 3)
TMino.prototype.constructor = TMino
TMino.prototype.type = 't'
TMino.prototype.blocks = [
    [block(0, 1), block(1, 0), block(1, 1), block(1, 2)],   // 01 10 11 12
    [block(0, 1), block(1, 1), block(1, 2), block(2, 1)],   // 01 11 12 21
    [block(1, 0), block(1, 1), block(1, 2), block(2, 1)],   // 10 11 12 21
    [block(0, 1), block(1, 0), block(1, 1), block(2, 1)]    // 01 10 11 21
]
TMino.prototype.corners = [
    [block(0, 0), block(0, 2), block(2, 2), block(2, 0)],
    [block(0, 2), block(2, 2), block(2, 0), block(0, 0)],
    [block(2, 2), block(2, 0), block(0, 0), block(0, 2)],
    [block(2, 0), block(0, 0), block(0, 2), block(2, 2)]
]
TMino.prototype.isTSpin = function (board) {
    var front = 0
    var back = 0
    var corners = this.corners[this.rotation]
    for (var i = 0; i < corners.length; i++) {
        var corner = corners[i];
        var row = this.row + corner.row
        var col = this.col + corner.col
        if (!isInBoard(row, col) || board[row][col].blocked) {
            i <= 1 ? front++ : back++
        }
    }
    if (front == 2 && back >= 1) {
        return T_SPIN_STATE.T_SPIN
    }
    if (back == 2 && front >= 1) {
        return T_SPIN_STATE.T_SPIN_MINI
    }
    return T_SPIN_STATE.NOT_T_SPIN
}

var T_SPIN_STATE = {
    NOT_T_SPIN: 0,
    T_SPIN_MINI: 1,
    T_SPIN: 2
}

function ZMino() { }
ZMino.prototype = new Tetrimino(0, 3)
ZMino.prototype.constructor = ZMino
ZMino.prototype.type = 'z'
ZMino.prototype.blocks = [
    [block(0, 0), block(0, 1), block(1, 1), block(1, 2)],   // 00 01 11 12
    [block(0, 2), block(1, 1), block(1, 2), block(2, 1)],   // 02 11 12 21
    [block(1, 0), block(1, 1), block(2, 1), block(2, 2)],   // 10 11 21 22
    [block(0, 1), block(1, 0), block(1, 1), block(2, 0)]    // 01 10 11 20
]