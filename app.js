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

    this.hold = new Figure('hold', new Tetrimino)
}

App.prototype.animate = function () {
    window.requestAnimationFrame(this.animate.bind(this))
}

///////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Grab a table DOM with id, and display tetrimino in it.
 * @param {string} id 
 * @param {*} tetrimino 
 */
function Figure(id, tetrimino) {
    this.table = []
    const tableDOM = nodeListToArray(document.getElementById(id).querySelectorAll('tr'))
    for (let i = 0; i < tableDOM.length; i++) {
        const row = nodeListToArray(tableDOM[i].querySelectorAll('td'))
        for (let j = 0; j < row.length; j++) {
            const td = row[j];
            td.className = 'hidden'
        }
        this.table.push(row)
    }
    if (tetrimino) {
        this.setTetrimino(tetrimino)
    }
    console.log(this.table)
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
    return row >= 0 && row <= board.length && col >= 0 && col <= board[0].length
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

Tetrimino.isObstructed = function (board, rotationOffset, rowOffset, colOffset) {
    const maxRotation = this.prototype.blocks.length
    const rotation = ((this.rotation + rotationOffset) % maxRotation + maxRotation) % maxRotation
    const shape = this.blocks[rotation]
    for (let i = 0; i < shape.blocks.length; i++) {
        const block = shape.blocks[i];
        const row = this.row + block.row + rowOffset
        const col = this.col + block.col + colOffset
        if (!block.isInBoard(board, this.row, this.col) || board[row][col].originalClass) {
            return true
        }
    }
    return false
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

///////////////////////////////////////////////////////////////////////////////////////////////////
