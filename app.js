window.onload = function () {
    window = new App
}

const console = window.console || { log: function () { } }

function nodeListToArray(nodeList) {
    return Array.prototype.slice.call(nodeList)
}

///////////////////////////////////////////////////////////////////////////////////////////////////

const CONTROLS = {
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    ROTATE_RIGHT: 'rotateRight',
    ROTATE_LEFT: 'rotateLeft',
    SOFT_DROP: 'softDrop',
    HARD_DROP: 'hardDrop',
    HOLD: 'hold'
}

const KEYMAP = {
    38: CONTROLS.ROTATE_RIGHT,
    88: CONTROLS.ROTATE_RIGHT,
    90: CONTROLS.ROTATE_LEFT,
    17: CONTROLS.ROTATE_LEFT,
    37: CONTROLS.MOVE_LEFT,
    39: CONTROLS.MOVE_RIGHT,
    16: CONTROLS.HOLD,
    67: CONTROLS.HOLD,
    32: CONTROLS.HARD_DROP,
    40: CONTROLS.SOFT_DROP
}

function App() {
    this.paused = false
    this.gravity = 1
    this.ghost = true

    window.addEventListener('keydown', this.onKeyDown.bind(this), false)
    window.addEventListener('keyup', this.onKeyUp.bind(this), false)

    window.requestAnimationFrame(this.animate.bind(this))

    this.board = new Board(this.gravity, this.ghost)

    this.pressing = {}
}

App.prototype.animate = function () {
    window.requestAnimationFrame(this.animate.bind(this))
    this.board.animate()

    const pressingKeys = Object.keys(this.pressing)
    for (let i = 0; i < pressingKeys.length; i++) {
        const key = pressingKeys[i]
        const keymap = KEYMAP[key]
        if (keymap == CONTROLS.MOVE_LEFT || keymap == CONTROLS.MOVE_RIGHT || keymap == CONTROLS.SOFT_DROP) {
            this.pressing[key]++
            if (this.pressing[key] >= this.board.das) {
                this.pressing[key] -= Math.max(this.board.das / DAS_SCALE, 1)
                this.control(KEYMAP[key])
            }
        }
    }
}

App.prototype.onKeyDown = function (e) {
    const control = KEYMAP[e.keyCode]
    if (control && !(e.keyCode in this.pressing)) {
        this.pressing[e.keyCode] = 0
        if (this.control(control)) {
            e.preventDefault()
        }
    }
}

App.prototype.control = function (control) {
    if (this.board.state == STATE.PLAYING) {
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

///////////////////////////////////////////////////////////////////////////////////////////////////

const STATE = {
    DEAD: 0,
    PLAYING: 1,
    PAUSED: 2
}

const FPS = 60

const DAS_SCALE = 20

const MIN_DAS = 10
const BOARD_ROW = 23
const BOARD_COL = 10

const SCORE_TYPE = {
    DROP: { score: 4 },
    SINGLE_LINE: { score: 100 },
    DOUBLE_LINE: { score: 300, description: 'DOUBLE +', type: 'silver' },
    TRIPLE_LINE: { score: 500, description: 'TRIPLE +', type: 'silver' },
    TETRIS: { score: 1000, description: 'TETRIS +', type: 'gold' },
    PERFECT_CLEAR: { score: 10000, description: 'PERFECT CLEAR +', type: 'aqua' },
    COMBO: { description: 'COMBO +' }
}

const LINE_SCORE = {
    1: SCORE_TYPE.SINGLE_LINE,
    2: SCORE_TYPE.DOUBLE_LINE,
    3: SCORE_TYPE.TRIPLE_LINE,
    4: SCORE_TYPE.TETRIS
}

function Board(gravity, ghost) {
    this.config(gravity, ghost)

    this.board = []
    const table = document.getElementById('board').children[0].children
    for (let i = 0; i < BOARD_ROW; i++) {
        const row = table[i].children
        row.blanks = BOARD_COL
        for (let col = 0; col < BOARD_COL; col++) {
            row[col].originalClass = row[col].className ? row[col].className : ''
            row[col].className = row[col].className || ''
        }
        this.board.push(row)
    }

    this.state = STATE.PLAYING
    this.leftFrames = 0

    this.holded = new Figure(document.getElementById('hold'), new Tetrimino)
    this.holdSwapped = false
    this.queue = new Queue()

    this.score = 0
    this.scoreDisplay = document.getElementById('score')
    this.scoreList = document.getElementById('score-list').children
    this.combo = null
    this.lastSpin = true

    this.ghostChanged
}

Board.prototype.config = function (gravity, ghost) {
    this.gravity = gravity
    this.ghostMode = ghost
    this.framePerTick = FPS / gravity
    this.das = Math.max(this.framePerTick / 3, MIN_DAS)
}

Board.prototype.animate = function () {
    if (this.state != STATE.PLAYING) {
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
        if (this.ghostMode) {
            this.removeGhost()
            this.updateGhost()
        }
        if (this.falling.isObstructed(this.board, 0, 0, 0)) {
            this.state = STATE.DEAD
            return
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
    const shape = this.falling.blocks[this.falling.rotation]
    let over = false
    const cleared = []
    for (let i = 0; i < shape.length; i++) {
        const block = shape[i];
        const row = this.falling.row + block.row
        const col = this.falling.col + block.col
        if (--this.board[row].blanks == 0) {
            cleared.push(row)
        }
        const td = this.board[row][col]
        over = over || row < 3
        td.blocked = true
    }
    for (let i = 0; i < cleared.length; i++) {
        for (let row = cleared[i]; row > 0; row--) {
            const rowAbove = this.board[row - 1]
            const clearedRow = this.board[row]
            clearedRow.blanks = rowAbove.blanks
            for (let col = 0; col < BOARD_COL; col++) {
                const tdAbove = rowAbove[col]
                const td = clearedRow[col]
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
        this.state = STATE.DEAD
    }
    this.falling = null
    this.holdSwapped = false

    this.addScore(SCORE_TYPE.DROP)
    if (cleared.length) {
        const score = this.addScore(LINE_SCORE[cleared.length])
        if (!this.combo) {
            this.combo = {
                type: SCORE_TYPE.COMBO.type,
                description: SCORE_TYPE.COMBO.description,
                score: score
            }
        } else {
            this.addScore(this.combo)
            this.combo.score += score
        }
    } else {
        this.combo = null
    }
}

Board.prototype.addScore = function (scoreData /* { score: Number[, description: String]} */) {
    if (scoreData.score) {
        this.score += scoreData.score
        this.scoreDisplay.textContent = this.score
    }

    if (scoreData.description) {
        for (let i = this.scoreList.length - 1; i > 0; i--) {
            const liAbove = this.scoreList[i - 1]
            const li = this.scoreList[i]

            li.className = liAbove.className
            li.textContent = liAbove.textContent
        }
        const li = this.scoreList[0]
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
    const isMovable = !this.falling.isObstructed(this.board, 0, 1, 0)
    if (isMovable) {
        let height = 0
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
    const falling = this.falling
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

function openSevenBag() {
    const bag = [
        new IMino,
        new JMino,
        new LMino,
        new OMino,
        new SMino,
        new TMino,
        new ZMino
    ]
    bag.choice = function () {
        const i = Math.floor(Math.random() * bag.length)
        const choosen = bag[i]
        bag.splice(i, 1)
        return choosen
    }
    return bag
}

function Queue() {
    this.queueDOM = document.getElementById('queue')
    this.bag = openSevenBag()
    this.queue = nodeListToArray(document.querySelectorAll('table.next'))
    for (let i = 0; i < this.queue.length; i++) {
        const figureDOM = this.queue[i];
        this.queue[i] = new Figure(figureDOM, this.bag.choice())
        if (this.bag.length == 0) {
            this.bag = openSevenBag()
        }
    }
}

Queue.prototype.shift = function () {
    const tetrimino = this.queue[0].tetrimino
    for (let i = 0; i < this.queue.length - 1; i++) {
        this.queue[i].setTetrimino(this.queue[i + 1].tetrimino)
    }
    this.queue[this.queue.length - 1].setTetrimino(this.bag.choice())
    if (this.bag.length == 0) {
        this.bag = openSevenBag()
    }
    return tetrimino
}

///////////////////////////////////////////////////////////////////////////////////////////////////

function Figure(table, tetrimino) {
    this.table = []
    const tableDOM = nodeListToArray(table.querySelectorAll('tr'))
    for (let i = 0; i < tableDOM.length; i++) {
        const row = nodeListToArray(tableDOM[i].children)
        for (let j = 0; j < row.length; j++) {
            const td = row[j];
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
        const shape = this.tetrimino.blocks[0]
        for (let i = 0; i < shape.length; i++) {
            const block = shape[i];
            const td = this.table[block.row][block.col]
            td.className = td.originalClass
        }
    }
    const shape = tetrimino.blocks[0]
    for (let i = 0; i < shape.length; i++) {
        const block = shape[i];
        const td = this.table[block.row][block.col]
        td.className = tetrimino.type
    }
    this.tetrimino = tetrimino
    return this
}

///////////////////////////////////////////////////////////////////////////////////////////////////

function Block(row, col) {
    this.row = row
    this.col = col
}

function block(row, col) {
    return new Block(row, col)
}

function isInBoard(board, row, col) {
    return row >= 0 && row < BOARD_ROW && col >= 0 && col < BOARD_COL
}

///////////////////////////////////////////////////////////////////////////////////////////////////

function Tetrimino(row, col) {
    this.row = row
    this.col = col
    this.rotation = 0
}

const GHOST = 'ghost'
Tetrimino.prototype.type = GHOST
Tetrimino.prototype.blocks = [[block(1, 0), block(0, 1), block(1, 2), block(0, 3)]]
Tetrimino.prototype.kicks = [
    {   // from 0
        '1': [{ col: -1, row: 0 }, { col: -1, row: -1 }, { col: 0, row: 2 }, { col: -1, row: 2 }],
        '-1': [{ col: 1, row: 0 }, { col: 1, row: -1 }, { col: 0, row: 2 }, { col: 1, row: 2 }]
    }, {// from 1
        '1': [{ col: 1, row: 0 }, { col: 1, row: 1 }, { col: 0, row: -2 }, { col: 1, row: -2 }],
        '-1': [{ col: 1, row: 0 }, { col: 1, row: 1 }, { col: 0, row: -2 }, { col: 1, row: -2 }]
    }, {// from 2
        '1': [{ col: 1, row: 0 }, { col: 1, row: 1 }, { col: 0, row: 2 }, { col: 1, row: 2 }],
        '-1': [{ col: -1, row: 0 }, { col: -1, row: -1 }, { col: 0, row: 2 }, { col: -1, row: 2 }]
    }, {// from 3
        '1': [{ col: -1, row: 0 }, { col: -1, row: 1 }, { col: 0, row: -2 }, { col: -1, row: -2 }],
        '-1': [{ col: -1, row: 0 }, { col: -1, row: 1 }, { col: 0, row: -2 }, { col: -1, row: -2 }]
    }
]

Tetrimino.prototype.isObstructed = function (board, rotationOffset, rowOffset, colOffset) {
    const maxRotation = this.blocks.length
    const rotation = ((this.rotation + rotationOffset) % maxRotation + maxRotation) % maxRotation
    const shape = this.blocks[rotation]
    for (let i = 0; i < shape.length; i++) {
        const block = shape[i];
        const row = this.row + block.row + rowOffset
        const col = this.col + block.col + colOffset
        if (!isInBoard(board, row, col) || board[row][col].blocked) {
            return true
        }
    }
    return false
}

Tetrimino.prototype.rotate = function (board, delta) {
    let failed = this.isObstructed(board, delta, 0, 0)
    let spin = false
    if (failed && this.kicks[this.rotation]) {
        const kicks = this.kicks[this.rotation][delta]
        for (let i = 0; i < kicks.length; i++) {
            const kick = kicks[i];
            if (!this.isObstructed(board, delta, kick.row, kick.col)) {
                this.row += kick.row
                this.col += kick.col
                failed = false
                spin = true
                break
            }
        }
    }
    if (!failed) {
        const maxRotation = this.blocks.length
        this.rotation = ((this.rotation + delta) % maxRotation + maxRotation) % maxRotation
    }
    return spin
}

Tetrimino.prototype.draw = function (board) {
    const shape = this.blocks[this.rotation]
    for (let i = 0; i < shape.length; i++) {
        const block = shape[i];
        const row = this.row + block.row
        const col = this.col + block.col
        const td = board[row][col]
        if (td.className != this.type) {
            td.className = this.type
        }
    }
}

Tetrimino.prototype.erase = function (board) {
    const shape = this.blocks[this.rotation]
    for (let i = 0; i < shape.length; i++) {
        const block = shape[i];
        const row = this.row + block.row
        const col = this.col + block.col
        const td = board[row][col]
        if (td.className == this.type) {
            td.className = td.originalClass
        }
    }
}

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
        '1': [{ col: 1, row: 0 }, { col: 1, row: -1 }, { col: 0, row: 2 }, { col: 1, row: 2 }],
        '-1': [{ col: -1, row: 0 }, { col: 2, row: 0 }, { col: -1, row: -2 }, { col: 2, row: -1 }]
    }, {// from 1
        '1': [{ col: -1, row: 0 }, { col: 2, row: 0 }, { col: -1, row: -2 }, { col: 2, row: 1 }],
        '-1': [{ col: 2, row: 0 }, { col: -1, row: 0 }, { col: 2, row: -1 }, { col: -1, row: 2 }]
    }, {// from 2
        '1': [{ col: 2, row: 0 }, { col: -1, row: 0 }, { col: 2, row: -1 }, { col: -1, row: 2 }],
        '-1': [{ col: 1, row: 0 }, { col: -2, row: 0 }, { col: 1, row: 2 }, { col: -2, row: -1 }]
    }, {// from 3
        '1': [{ col: 1, row: 0 }, { col: -2, row: 0 }, { col: 1, row: 2 }, { col: -2, row: -1 }],
        '-1': [{ col: -2, row: 0 }, { col: 1, row: 0 }, { col: -2, row: 1 }, { col: 1, row: -2 }]
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