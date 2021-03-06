

let _curState = {
    board: [], 
    status:"notStarted",  // #notStarted #started #gameOver #winner
    difficulty: undefined, 
    mines: {
        tofind: undefined,
        flagedAs: 0
    },
    time: 0, 
    totalToReveal: undefined,
    // save initial values
    init () {
        var origValues = {};
        for (var prop in this) {
            if (this.hasOwnProperty(prop) && prop != "origValues") {
                origValues[prop] = this[prop];
            }
        }
        this.origValues = origValues;
    },
    // restore initial values
    reset () {
        for (var prop in this.origValues) {
            if ( prop === 'difficulty') continue
            this[prop] = this.origValues[prop];
        }
    }, 
    startTimer () {
        let timerID = window.setInterval( () => {
            if ( _curState.status !== "started") {
                window.clearInterval(timerID)
                return
            }
            _curState.time++;
            notifyAll()
        }, 1000 )
    }
}

export const save = () => {
    _curState.init()
}

let bestCopyEver = src => Object.assign({}, src);

const statesHistory = []
const _listeners = []

export const subscribe = (listener) => {
    _listeners.push(listener)
}

const notifyAll = () => _listeners.forEach(l => l(_curState))

export const resetGame = () => {
    _curState.board.length = 0;
    _curState.status = "notStarted";
    _curState.time = 0;
    _curState.mines = {
        tofind: undefined,
        flagedAs: 0
    };
}

export const setDifficulty = (diff) => {
    _curState.difficulty = diff
}

export let customSize = { wide: undefined , hight: undefined, mines: undefined} 

export const getSize = ( difficulty ) => {
    if ( difficulty === 'easy'){
        return { wide: 8, hight: 6, mines: 9}
    } else if ( difficulty === 'medium'){
        return { wide: 10, hight: 8, mines: 20}
    } else if ( difficulty === 'hard'){
        return { wide:12   , hight:12, mines: 59}
    } else if ( difficulty === 'custom') {
        return { wide: customSize.wide   , hight: customSize.hight , mines: customSize.mines}
    }
}

let field = ( positionX, positionY, gridName ) => {
    let state = undefined; //  0-8 reveald
    let revealed = false;
    let flagget = false;
    let mine = false;
    let getState = () => state;
    let setMine = () => { mine = true };
    let isMine = () => mine;
    let toggleFlag = () => { 
        flagget = !flagget;
        revealed = !revealed;
    };
    let showMine = () => state = 'm'
    let isFlagget = () => flagget;
    let isRevealed = () => revealed;
    let setReveal = () => { revealed = true; }
    let findMines = () => {
        let mines = 0;
        for (let x = (positionX === 0 ? positionX : (positionX - 1) ) ; x <= ( positionX === (gridName[0].length - 1) ? positionX : (positionX + 1) ) ; x++){
            for (let y = (!positionY ? positionY : (positionY - 1) ) ; y <= ( positionY === (gridName.length  - 1) ? positionY : (positionY + 1) ) ; y++){
                if ( x !== positionX || y !== positionY ) {
                    if(gridName[y][x].isMine()){ 
                        mines++;
                    }
                }
            }
        }
        state = mines
        return mines
    }
    return {
        toggleFlag, 
        isFlagget,
        setMine, 
        findMines, 
        isMine,
        getState, 
        isRevealed, 
        setReveal,
        showMine, 
        flagget
    }
} 

const update = (action, state) => {
    // kopia
    if (action.type === "changeDifficulty"){
        let gameSize = getSize(action.payload)
        // // reset game
        state.reset()
        const ToReveal = gameSize.wide * gameSize.hight;
        // setup new board
        const newBoard = setupMinefield(gameSize.wide, gameSize.hight);
        return { 
            ...state,
            mines: { //*
                tofind: undefined,
                flagedAs: 0
            },
            totalToReveal: ToReveal,
            board: newBoard.map( arr => [...arr]), 
            difficulty: action.payload
        }
    } else if (action.type === "leftClick") {
        return leftClickAction(action.payload.x, action.payload.y, state)
    } else if (action.type === "rightClick") {
        return rightClickAction(action.payload.x, action.payload.y, state)
    }
    return  null
}

export const dispatchAction =  (action) => {
    const newState = update(action, _curState);
    if (!newState) return

    statesHistory.push(_curState) 
    _curState = newState;
    notifyAll();
}

let setRundomMines = (notX, notY, minefield) => {
    let allPosible = []
    const gameSize = getSize(_curState.difficulty)
    for( let i = 0 ; i < gameSize.wide ; i++  ){
        for( let j = 0 ; j < gameSize.hight ; j++ ){  
            if( (i !== notX -1) && i !== notX && (i !== notX +1) || j !== notY && (j !== notY +1) && (j !== notY -1)){
                allPosible.push([i,j])
            }
        }
    }
    if ( allPosible.length < gameSize.mines ) {
        console.log('no bombs')
        return // no place to set mines
    }
    // set mines
    for ( let m = 0 ; m < gameSize.mines ; m++ ){
        let randIndx = Math.floor( Math.random() * allPosible.length )
        minefield[ allPosible[randIndx][1] ][ allPosible[randIndx][0] ].setMine()
        allPosible.splice(randIndx, 1)
    }
    _curState.mines.tofind = gameSize.mines;
}

const leftClickAction = (x, y, state) => {
    const gameSize = getSize(state.difficulty)
    const newState = bestCopyEver(state)
    let minefield = newState.board.map( arr => [...arr])
    const checkNeighbours = (x, y, mineArr, state) => {
        for (let xx = (x === 0 ? x : (x - 1) ) ; xx <= ( x === (mineArr[0].length - 1) ? x : (x + 1) ) ; xx++){
            for (let yy = (!y ? y : (y - 1) ) ; yy <= ( y === (mineArr.length  - 1) ? y : (y + 1) ) ; yy++){
                if ( (xx !== x || yy !== y) ) {
                    if ( !mineArr[yy][xx].isRevealed() ) {
                        revealOne( xx, yy, mineArr, newState);
                        if ( mineArr[yy][xx].findMines() === 0 ) {
                            checkNeighbours(xx, yy, mineArr);
                        }
                    }
                }
            }
        }
    }
    if ( newState.status === 'gameOver') return 
    if (x <= gameSize.wide && y <= gameSize.hight){

        if ( minefield[y][x].isFlagget() ) return 
        
        if ( newState.status === 'notStarted' ) {
            newState.board = []
            newState.mines =  {
                tofind: gameSize.mines,
                flagedAs: 0
            }
            console.log(newState.mines)
            newState.startTimer()
            newState.status = 'started'
            minefield = setupMinefield(gameSize.wide, gameSize.hight).map( arr => [...arr]);
            // set mines exlude minefield[y][x] and neighbours
            setRundomMines(x, y, minefield)
        } 

        if( minefield[y][x].isMine() ){
            newState.status = 'gameOver';
            revealAll(minefield)
            return { ...newState, board: minefield.map( arr => [...arr]) }    
        } else if ( !minefield[y][x].isRevealed() ) {
            revealOne( x, y, minefield, newState )
            console.log(`${newState.totalToReveal} , ${newState.mines.tofind}`)
            if ( minefield[y][x].findMines() === 0 ) {
                checkNeighbours(x, y, minefield, newState);
            }
        }
    } 
    return { ...newState, board: minefield.map( arr => [...arr]) }

}

const rightClickAction = (x, y, state) => {
    let gameSize = getSize(_curState.difficulty)
    const newState = bestCopyEver(state)
    let minefield = newState.board.map( arr => [...arr])
    if (minefield[y][x].getState() === undefined){
        minefield[y][x].toggleFlag();
        if(minefield[y][x].isFlagget()){
            newState.mines.flagedAs++;
            newState.totalToReveal--;
            if( minefield[y][x].isMine() ) {
                newState.mines.tofind--
                if (newState.mines.tofind === 0 && newState.mines.flagedAs <= gameSize.mines ) {
                    newState.status = 'winner';
                }
            };
        } else if (!minefield[y][x].isFlagget()){
            newState.mines.flagedAs--;
            newState.totalToReveal++;
            if( minefield[y][x].isMine() ) {
                newState.mines.tofind++
            }
        }
    }
    return { ...newState, board: minefield.map( arr => [...arr]) }
}
let revealOne = (x, y, mineArr, state) => {
    state.totalToReveal--
    if (state.totalToReveal === state.mines.tofind && state.status === 'started') { 
        state.status = 'winner'
    }
    console.log(state.totalToReveal, state.mines.tofind )

    mineArr[y][x].setReveal()
}

let revealAll = (minefield) => {
    for( let i = 0 ; i < minefield[0].length ; i++  ){
        for( let j = 0 ; j < minefield.length ; j++ ){  
            if( minefield[j][i].isMine() ){
                minefield[j][i].showMine()
            } else {
                minefield[j][i].setReveal()
                minefield[j][i].findMines()
            }
        }
    }    
}

let setupMinefield = (sizeX, sizeY) => {
    let minefield = [];
    for( let y = 0 ; y < sizeY ; y++ ){
        minefield[y] = []
        for( let x = 0 ; x < sizeX ; x++ ){
            minefield[y].push( field(x, y, minefield) )
        }
    }
    return minefield
}



