window.onload = function () {
    window = new App
}

const console = window.console || { log: function () { } }

function nodeListToArray(nodeList) {
    return Array.prototype.slice.call(nodeList)
}

///////////////////////////////////////////////////////////////////////////////////////////////////

function App() {
    this.paused = false
    this.gravity = 1
    this.ghost = true

    window.requestAnimationFrame(this.animate.bind(this))

    this.board = new Board(this.gravity, this.ghost)
}

App.prototype.animate = function () {
    window.requestAnimationFrame(this.animate.bind(this))
    this.board.animate()
}

///////////////////////////////////////////////////////////////////////////////////////////////////

const DEAD = 0
const PLAYING = 1
const PAUSED = 2

function Board(gravity, ghost) {
    this.config(gravity, ghost)

    this.board = []
    const table = nodeListToArray(document.getElementById('board').querySelectorAll('tr'))
    for (let i = 0; i < table.length; i++) {
        this.board.push(nodeListToArray(table[i].children))
    }

    this.state = PLAYING

    this.hold = new Figure(document.getElementById('hold'), new Tetrimino)
    this.queue = new Queue()

    // this.falling = this.queue.shift()
}

Board.prototype.config = function (gravity, ghost) {
    this.gravity = gravity
    this.ghost = ghost
    this.framePerTick = 60 / gravity
    this.leftFrames = 0
}

Board.prototype.animate = function () {
    if (this.state != PLAYING) {
        return
    }

    this.leftFrames--
    if (this.leftFrames <= 0) {
        this.tick()
        this.leftFrames += this.framePerTick
    }
}

Board.prototype.tick = function () {
    console.log('tick')
    if (this.falling) {
        this.softDrop()
    }
    else {
        this.falling = this.queue.shift()
        this.falling.draw(this.board)
    }
}

Board.prototype.softDrop = function () {
    if (this.falling && !this.falling.isObstructed(this.board, 0, 1, 0)) {
        this.falling.erase(this.board)
        this.falling.row++
        this.falling.draw(this.board)
    }
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
            if (td.originalClass) {
                td.className = td.originalClass
                td.originalClass = undefined
            }
        }
    }
    const shape = tetrimino.blocks[0]
    for (let i = 0; i < shape.length; i++) {
        const block = shape[i];
        const td = this.table[block.row][block.col]
        td.originalClass = td.className
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

Block.prototype.isInBoard = function (board, rowOffset, colOffset) {
    const row = this.row + rowOffset
    const col = this.col + colOffset
    return row >= 0 && row < board.length && col >= 0 && col < board[0].length
}

///////////////////////////////////////////////////////////////////////////////////////////////////

function Tetrimino(row, col) {
    this.row = row
    this.col = col
    this.rotation = 0
}

Tetrimino.prototype.type = 'ghost'
Tetrimino.prototype.blocks = [[block(1, 0), block(0, 1), block(1, 2), block(0, 3)]]
Tetrimino.prototype.kicks = [
    {   // from 0
        '1': [{ row: -1, col: 0 }, { row: -1, col: -1 }, { row: 0, col: 2 }, { row: -1, col: 2 }],
        '-1': [{ row: 1, col: 0 }, { row: 1, col: -1 }, { row: 0, col: 2 }, { row: 1, col: 2 }]
    }, {// from 1
        '1': [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 0, col: -2 }, { row: 1, col: -2 }],
        '-1': [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 0, col: -2 }, { row: 1, col: -2 }]
    }, {// from 2
        '1': [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }],
        '-1': [{ row: -1, col: 0 }, { row: -1, col: -1 }, { row: 0, col: 2 }, { row: -1, col: 2 }]
    }, {// from 3
        '1': [{ row: -1, col: 0 }, { row: -1, col: 1 }, { row: 0, col: -2 }, { row: -1, col: -2 }],
        '-1': [{ row: -1, col: 0 }, { row: -1, col: 1 }, { row: 0, col: -2 }, { row: -1, col: -2 }]
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
        if (!block.isInBoard(board, this.row + rowOffset, this.col + colOffset) || board[row][col].originalClass) {
            return true
        }
    }
    return false
}

Tetrimino.prototype.draw = function (board) {
    const shape = this.blocks[this.rotation]
    for (let i = 0; i < shape.length; i++) {
        const block = shape[i];
        if (block.isInBoard(board, this.row, this.col)) {
            const row = this.row + block.row
            const col = this.col + block.col
            const td = board[row][col]
            td.originalClass = td.className
            td.className = this.type
        }
    }
}

Tetrimino.prototype.erase = function (board) {
    const shape = this.blocks[this.rotation]
    for (let i = 0; i < shape.length; i++) {
        const block = shape[i];
        if (block.isInBoard(board, this.row, this.col)) {
            const row = this.row + block.row
            const col = this.col + block.col
            const td = board[row][col]
            td.className = td.originalClass
            td.originalClass = undefined
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////

function IMino() { }

IMino.prototype = new Tetrimino(0, 3)
IMino.prototype.type = 'i'
IMino.prototype.blocks = [
    [block(1, 0), block(1, 1), block(1, 2), block(1, 3)],
    [block(0, 2), block(1, 2), block(2, 2), block(3, 2)],
    [block(2, 0), block(2, 1), block(2, 2), block(2, 3)],
    [block(0, 1), block(1, 1), block(2, 1), block(3, 1)]
]
IMino.prototype.kicks = [
    {   // from 0
        '1': [{ row: 1, col: 0 }, { row: 1, col: -1 }, { row: 0, col: 2 }, { row: 1, col: 2 }],
        '-1': [{ row: -1, col: 0 }, { row: 2, col: 0 }, { row: -1, col: -2 }, { row: 2, col: -1 }]
    }, {// from 1
        '1': [{ row: -1, col: 0 }, { row: 2, col: 0 }, { row: -1, col: -2 }, { row: 2, col: 1 }],
        '-1': [{ row: 2, col: 0 }, { row: -1, col: 0 }, { row: 2, col: -1 }, { row: -1, col: 2 }]
    }, {// from 2
        '1': [{ row: 2, col: 0 }, { row: -1, col: 0 }, { row: 2, col: -1 }, { row: -1, col: 2 }],
        '-1': [{ row: 1, col: 0 }, { row: -2, col: 0 }, { row: 1, col: 2 }, { row: -2, col: -1 }]
    }, {// from 3
        '1': [{ row: 1, col: 0 }, { row: -2, col: 0 }, { row: 1, col: 2 }, { row: -2, col: -1 }],
        '-1': [{ row: -2, col: 0 }, { row: 1, col: 0 }, { row: -2, col: 1 }, { row: 1, col: -2 }]
    }
]


function JMino() { }
JMino.prototype = new Tetrimino(0, 3)
JMino.prototype.type = 'j'

function LMino() { }
LMino.prototype = new Tetrimino(0, 3)
LMino.prototype.type = 'l'

function OMino() { }
OMino.prototype = new Tetrimino(0, 4)
OMino.prototype.type = 'o'

function TMino() { }
TMino.prototype = new Tetrimino(0, 3)
TMino.prototype.type = 't'

function SMino() { }
SMino.prototype = new Tetrimino(0, 3)
SMino.prototype.type = 's'

function ZMino() { }
ZMino.prototype = new Tetrimino(0, 3)
ZMino.prototype.type = 'z'