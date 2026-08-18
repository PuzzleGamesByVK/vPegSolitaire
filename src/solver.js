
const LURD = [-1, -9, 1, 9]; // Left, Up, Right, Down for 9x9 board representation

/**
 * Helper to extract playable cell indices from an 81-length board array.
 */
function getPlayableMap(board) {
    const map = [];
    for (let i = 0; i < 81; i++) {
        if (board[i] !== -1) map.push(i);
    }
    return map;
}

/**
 * Creates a unique string representation of the board for visited state tracking.
 * Safe for any board size (7x7, 9x9, 81-length arrays) avoiding Bitwise integer limit issues.
 */
function getBoardHash(board) {
    let hash = "";
    for (let i = 0; i < 81; i++) {
        if (board[i] !== -1) {
            hash += board[i];
        }
    }
    return hash;
}

/**
 * Single jump move generator tailored for 9x9 grid geometry.
 */
function getSingleMovesForPeg(board, startIdx) {//DFS
    const moves = [];
    for (const d of LURD) {
        const mid = startIdx + d;
        const end = startIdx + 2 * d;

        if (end < 0 || end >= 81) continue;

        // Prevent horizontal jumping across board borders in a 9x9 grid
        if (Math.abs(d) === 1 && Math.floor(startIdx / 9) !== Math.floor(end / 9)) continue;

        if (board[mid] === 1 && board[end] === 0) {
            const nextBoard = new Int8Array(board);
            nextBoard[startIdx] = 0;
            nextBoard[mid] = 0;
            nextBoard[end] = 1;

            moves.push({
                finalBoard: nextBoard,
                step: { path: [startIdx, end], captured: [mid] }
            });
        }
    }
    return moves;
}

/**
 * Recursive generator to discover multi-jump chains (Par moves) for a single peg.
 */
function getChainMovesForPeg(board, currentIdx, currentPath = [], currentCaptured = []) { //BFS4Par
    let moves = [];
    
    for (const d of LURD) {
        const mid = currentIdx + d;
        const end = currentIdx + 2 * d;

        if (end < 0 || end >= 81) continue;
        if (Math.abs(d) === 1 && Math.floor(currentIdx / 9) !== Math.floor(end / 9)) continue;

        if (board[mid] === 1 && board[end] === 0) {
            const nextBoard = new Int8Array(board);
            nextBoard[currentIdx] = 0;
            nextBoard[mid] = 0;
            nextBoard[end] = 1;

            const newPath = currentPath.length === 0 ? [currentIdx, end] : [...currentPath, end];
            const newCaptured = [...currentCaptured, mid];

            const moveObj = {
                finalBoard: nextBoard,
                step: { path: newPath, captured: newCaptured }
            };

            moves.push(moveObj);

            // Recursively search for continuous jumps using the same peg
            const subMoves = getChainMovesForPeg(nextBoard, end, newPath, newCaptured);
            moves = moves.concat(subMoves);
        }
    }
    return moves;
}

/**
 * TYPE 1: DFS SOLVER
 * Designed for large boards (French 9x9, German 9x9, pegs > 25).
 * Optimized for speed with String Hashing and execution time safety limits.
 */
export function solveDFS(initialBoard, goalIdx = 40, maxTimeMs = 15000) {
    const failedStates = new Set();
    let solution = null;
    const startTime = Date.now();

    function dfs(board, history) {
        if (solution || (Date.now() - startTime) > maxTimeMs) return;

        const hash = getBoardHash(board);
        if (failedStates.has(hash)) return;

        const currentPegs = [];
        for (let i = 0; i < 81; i++) {
            if (board[i] === 1) currentPegs.push(i);
        }

        // Winning Condition Check
        if (currentPegs.length === 1) {
            if (goalIdx === -1 || currentPegs[0] === goalIdx) {
                solution = history;
                return;
            }
        }

        // Generate and execute valid moves
        let expandedAnyMove = false;
        for (const pegIdx of currentPegs) {
            const moves = getSingleMovesForPeg(board, pegIdx);
            if (moves.length > 0) expandedAnyMove = true;

            for (const move of moves) {
                dfs(move.finalBoard, [...history, move.step]);
                if (solution) return;
            }
        }

        // If no solution found from this path, mark state as dead-end
        failedStates.add(hash);
    }

    console.log(`[Solver] Running DFS Search... Max Timeout: ${maxTimeMs}ms`);
    dfs(new Int8Array(initialBoard), []);

    if (solution) {
        console.table({
            "Result": "Success (DFS)",
            "Total Moves": solution.length,
            "Failed States Cached": failedStates.size,
            "Execution Time (ms)": Date.now() - startTime
        });
        return solution;
    } else {
        if (Date.now() - startTime > maxTimeMs) {
            console.warn(`[Solver] DFS execution timed out after ${maxTimeMs}ms.`);
        } else {
            console.error("[Solver] DFS completed: No solution exists for this target configuration.");
        }
        return null;
    }
}

/**
 * TYPE 2: PAR / BFS SOLVER WITH RECURSIVE CHAIN JUMPS
 * Designed for smaller/standard layouts (English 7x7, pegs <= 25).
 * Finds optimal path length considering multi-jumps as a single move.
 */
export function solveBFS(initialBoard, goalIdx = 40) {
    const totalPegs = initialBoard.filter(v => v === 1).length;

    // Route large boards (> 25 pegs) directly to Type 1 (DFS)
    if (totalPegs > 25) {
        console.log(`[Solver] Peg count (${totalPegs}) > 25. Routing to DFS Solver...`);
        return solveDFS(initialBoard, goalIdx);
    }

    const startTime = Date.now();
    let queue = [{ board: new Int8Array(initialBoard), history: [] }];
    let visited = new Set();
    visited.add(getBoardHash(initialBoard));

    let statesExamined = 0;
    let maxQueueSize = 0;

    console.log("[Solver] Mode: PAR / BFS Search (Multi-Jump Chain Recursive Enabled)");

    while (queue.length > 0) {
        // Safety timeout for BFS (8 seconds)
        if (Date.now() - startTime > 8000) {
            console.warn("[Solver] BFS Timeout reached. Fallback to DFS...");
            return solveDFS(initialBoard, goalIdx);
        }

        let { board, history } = queue.shift();
        statesExamined++;
        maxQueueSize = Math.max(maxQueueSize, queue.length);

        const currentPegs = [];
        for (let i = 0; i < 81; i++) {
            if (board[i] === 1) currentPegs.push(i);
        }

        // Check winning condition
        if (currentPegs.length === 1) {
            if (goalIdx === -1 || currentPegs[0] === goalIdx) {
                console.table({
                    "Result": "Success (PAR / BFS)",
                    "Total Moves (Par)": history.length,
                    "States Examined": statesExamined,
                    "Max Queue Size": maxQueueSize,
                    "Visited Set Size": visited.size,
                    "Execution Time (ms)": Date.now() - startTime
                });
                return history;
            }
        }

        // Generate full recursive jump chains for every peg
        for (const i of currentPegs) {
            const chainMoves = getChainMovesForPeg(board, i);
            for (const move of chainMoves) {
                const hash = getBoardHash(move.finalBoard);
                if (!visited.has(hash)) {
                    visited.add(hash);
                    queue.push({
                        board: move.finalBoard,
                        history: [...history, move.step]
                    });
                }
            }
        }
    }

    console.error("[Solver] BFS completed: No solution found.");
    return null;
}