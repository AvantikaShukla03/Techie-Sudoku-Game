class SudokuGame {
    constructor() {
        this.board = Array.from({ length: 9 }, () => Array(9).fill(0));
        this.solution = Array.from({ length: 9 }, () => Array(9).fill(0));
        this.initialBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
        this.selectedCell = null;
        this.hintsRemaining = 3;
        this.score = 0;
        this.completedCount = 0;
        this.gameStartTime = null;
        this.timerInterval = null;
        this.isGameActive = false;
        
        this.initializeGame();
        this.setupEventListeners();
    }

    initializeGame() {
        this.createSudokuGrid();
        this.updateDisplay();
        this.startNewGame();
    }

    createSudokuGrid() {
        const grid = document.getElementById('sudoku-grid');
        grid.innerHTML = '';
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'sudoku-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.dataset.index = row * 9 + col;
                
                cell.addEventListener('click', () => this.selectCell(row, col));
                grid.appendChild(cell);
            }
        }
    }

    setupEventListeners() {
        // Game control buttons
        document.getElementById('new-game').addEventListener('click', () => this.startNewGame());
        document.getElementById('solve-puzzle').addEventListener('click', () => this.solvePuzzle());
        document.getElementById('hint').addEventListener('click', () => this.getHint());
        document.getElementById('play-again').addEventListener('click', () => this.startNewGame());

        // Number pad buttons
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const number = parseInt(btn.dataset.number);
                this.inputNumber(number);
            });
        });

        // Difficulty selector
        document.getElementById('difficulty-select').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (!this.isGameActive) return;
            
            if (e.key >= '1' && e.key <= '9') {
                this.inputNumber(parseInt(e.key));
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                this.inputNumber(0);
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
                       e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                this.handleArrowKeys(e.key);
            }
        });
    }

    async startNewGame() {
        this.isGameActive = true;
        this.hintsRemaining = 3;
        this.score = 0;
        this.completedCount = 0;
        this.selectedCell = null;
        this.gameStartTime = Date.now();
        
        this.updateDisplay();
        this.startTimer();
        this.hideModal();
        
        try {
            const difficulty = document.getElementById('difficulty-select').value;
            await this.fetchNewPuzzle(difficulty);
            this.showToast('New game started!', 'success');
        } catch (error) {
            this.showToast('Failed to load puzzle. Using sample puzzle.', 'warning');
            this.loadSamplePuzzle();
        }
    }

    async fetchNewPuzzle(difficulty) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                try {
                    const response = JSON.parse(xhr.response);
                    this.board = response.board.map(row => [...row]);
                    this.initialBoard = response.board.map(row => [...row]);
                    this.solution = Array.from({ length: 9 }, () => Array(9).fill(0));
                    
                    // Generate solution for hints
                    this.generateSolution();
                    this.fillBoard();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            xhr.onerror = reject;
            xhr.open('GET', `https://sugoku.onrender.com/board?difficulty=${difficulty}`);
            xhr.send();
        });
    }

    loadSamplePuzzle() {
        // Sample puzzle for fallback
        this.board = [
            [5,3,0,0,7,0,0,0,0],
            [6,0,0,1,9,5,0,0,0],
            [0,9,8,0,0,0,0,6,0],
            [8,0,0,0,6,0,0,0,3],
            [4,0,0,8,0,3,0,0,1],
            [7,0,0,0,2,0,0,0,6],
            [0,6,0,0,0,0,2,8,0],
            [0,0,0,4,1,9,0,0,5],
            [0,0,0,0,8,0,0,7,9]
        ];
        this.initialBoard = this.board.map(row => [...row]);
        this.generateSolution();
        this.fillBoard();
    }

    generateSolution() {
        // Create a copy of the board for solving
        const tempBoard = this.board.map(row => [...row]);
        this.solveSudoku(tempBoard);
        this.solution = tempBoard;
    }

    fillBoard() {
        const cells = document.querySelectorAll('.sudoku-cell');
        cells.forEach((cell, index) => {
            const row = Math.floor(index / 9);
            const col = index % 9;
            const value = this.board[row][col];
            
            cell.textContent = value || '';
            cell.className = 'sudoku-cell';
            
            if (value !== 0) {
                cell.classList.add('initial');
            }
        });
    }

    selectCell(row, col) {
        if (!this.isGameActive || this.initialBoard[row][col] !== 0) return;
        
        // Remove previous selection
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            cell.classList.remove('selected');
        });
        
        // Select new cell
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('selected');
        this.selectedCell = { row, col };
        
        // Highlight related cells
        this.highlightRelatedCells(row, col);
    }

    highlightRelatedCells(row, col) {
        document.querySelectorAll('.sudoku-cell').forEach(cell => {
            cell.classList.remove('related');
        });
        
        // Highlight same row, column, and 3x3 box
        for (let i = 0; i < 9; i++) {
            // Same row
            document.querySelector(`[data-row="${row}"][data-col="${i}"]`).classList.add('related');
            // Same column
            document.querySelector(`[data-row="${i}"][data-col="${col}"]`).classList.add('related');
        }
        
        // Same 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                document.querySelector(`[data-row="${i}"][data-col="${j}"]`).classList.add('related');
            }
        }
    }

    inputNumber(number) {
        if (!this.selectedCell || !this.isGameActive) return;
        
        const { row, col } = this.selectedCell;
        if (this.initialBoard[row][col] !== 0) return; // Can't modify initial cells
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        
        if (number === 0) {
            // Clear cell
            this.board[row][col] = 0;
            cell.textContent = '';
            cell.classList.remove('error', 'correct', 'hint');
        } else {
            // Check if the number is valid
            const isValid = this.isValidMove(row, col, number);
            
            this.board[row][col] = number;
            cell.textContent = number;
            cell.classList.remove('error', 'correct', 'hint');
            
            if (isValid) {
                cell.classList.add('correct');
                this.score += 10;
                this.completedCount++;
                
                // Check if puzzle is complete
                if (this.isPuzzleComplete()) {
                    this.gameComplete();
                }
            } else {
                cell.classList.add('error');
                this.score = Math.max(0, this.score - 5);
            }
        }
        
        this.updateDisplay();
    }

    isValidMove(row, col, number) {
        // Check row
        for (let j = 0; j < 9; j++) {
            if (j !== col && this.board[row][j] === number) return false;
        }
        
        // Check column
        for (let i = 0; i < 9; i++) {
            if (i !== row && this.board[i][col] === number) return false;
        }
        
        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                if ((i !== row || j !== col) && this.board[i][j] === number) return false;
            }
        }
        
        return true;
    }

    getHint() {
        if (this.hintsRemaining <= 0) {
            this.showToast('No hints remaining!', 'warning');
            return;
        }
        
        if (!this.selectedCell) {
            this.showToast('Please select a cell first!', 'warning');
            return;
        }
        
        const { row, col } = this.selectedCell;
        if (this.initialBoard[row][col] !== 0) {
            this.showToast('Cannot hint on initial cells!', 'warning');
            return;
        }
        
        const correctNumber = this.solution[row][col];
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        
        this.board[row][col] = correctNumber;
        cell.textContent = correctNumber;
        cell.classList.remove('error');
        cell.classList.add('hint');
        
        this.hintsRemaining--;
        this.score += 5; // Bonus for using hint
        
        this.updateDisplay();
        this.showToast(`Hint used! Correct number is ${correctNumber}`, 'success');
        
        // Check if puzzle is complete
        if (this.isPuzzleComplete()) {
            this.gameComplete();
        }
    }

    solvePuzzle() {
        if (!this.isGameActive) return;
        
        this.board = this.solution.map(row => [...row]);
        this.fillBoard();
        this.showToast('Puzzle solved!', 'success');
        this.gameComplete();
    }

    solveSudoku(board) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (this.isValidMoveForSolver(board, row, col, num)) {
                            board[row][col] = num;
                            if (this.solveSudoku(board)) {
                                return true;
                            }
                            board[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    isValidMoveForSolver(board, row, col, num) {
        // Check row
        for (let j = 0; j < 9; j++) {
            if (board[row][j] === num) return false;
        }
        
        // Check column
        for (let i = 0; i < 9; i++) {
            if (board[i][col] === num) return false;
        }
        
        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                if (board[i][j] === num) return false;
            }
        }
        
        return true;
    }

    isPuzzleComplete() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === 0) return false;
            }
        }
        return true;
    }

    gameComplete() {
        this.isGameActive = false;
        this.stopTimer();
        
        const finalTime = this.getElapsedTime();
        const finalScore = this.score + Math.max(0, 300 - Math.floor(finalTime / 1000)) * 10;
        
        document.getElementById('final-time').textContent = this.formatTime(finalTime);
        document.getElementById('final-score').textContent = finalScore;
        
        this.showModal();
        this.showToast('Congratulations! Puzzle completed!', 'success');
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.isGameActive) {
                document.getElementById('timer').textContent = this.formatTime(this.getElapsedTime());
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    getElapsedTime() {
        return this.gameStartTime ? Date.now() - this.gameStartTime : 0;
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    handleArrowKeys(key) {
        if (!this.selectedCell) return;
        
        let { row, col } = this.selectedCell;
        
        switch (key) {
            case 'ArrowUp':
                row = Math.max(0, row - 1);
                break;
            case 'ArrowDown':
                row = Math.min(8, row + 1);
                break;
            case 'ArrowLeft':
                col = Math.max(0, col - 1);
                break;
            case 'ArrowRight':
                col = Math.min(8, col + 1);
                break;
        }
        
        this.selectCell(row, col);
    }

    updateDisplay() {
        document.getElementById('hint-count').textContent = this.hintsRemaining;
        document.getElementById('score').textContent = this.score;
        document.getElementById('completed-count').textContent = this.completedCount;
        
        // Update button states
        document.getElementById('hint').disabled = this.hintsRemaining <= 0;
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    showModal() {
        document.getElementById('game-over-modal').style.display = 'block';
    }

    hideModal() {
        document.getElementById('game-over-modal').style.display = 'none';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SudokuGame();
});