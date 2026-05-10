const LURD = [-1, -9, 1, 9];

function getPlayableMap(board) {
    const map = [];
    for (let i = 0; i < 81; i++) {
        if (board[i] !== -1) map.push(i);
    }
    return map;
}

function getBitmask(board, playableMap) {
    let mask = 0n;
    for (let i = 0; i < playableMap.length; i++) {
        if (board[playableMap[i]] === 1) mask |= (1n << BigInt(i));
    }
    return mask;
}

/**
 * findChains: Returns all multi-jump sequences for a peg.
 * If 'isParMode' is false, it returns only single jumps.
 */
function getMovesForPeg(board, startIdx, isParMode) {
    const sequences = [];

    function findChains(currentBoard, path, captured) {
        const currentPos = path[path.length - 1];
        let found = false;

        for (const d of LURD) {
            const mid = currentPos + d;
            const end = currentPos + 2 * d;

            if (end < 0 || end >= 81) continue;
            if (Math.abs(d) === 1 && Math.floor(currentPos / 9) !== Math.floor(end / 9)) continue;

            if (currentBoard[mid] === 1 && currentBoard[end] === 0) {
                found = true;
                const nextBoard = new Int8Array(currentBoard);
                nextBoard[currentPos] = 0;
                nextBoard[mid] = 0;
                nextBoard[end] = 1;

                const nextPath = [...path, end];
                const nextCaptured = [...captured, mid];

                sequences.push({ path: nextPath, captured: nextCaptured, finalBoard: nextBoard });

                // Only recurse if we want to achieve "Par" (multi-jumps)
                if (isParMode) {
                    findChains(nextBoard, nextPath, nextCaptured);
                }
            }
        }
    }

    findChains(board, [startIdx], []);
    return sequences;
}

export function solveBFS(initialBoard, goalIdx = 40, isParMode = true) {
    const startTime = Date.now();
    const playableMap = getPlayableMap(initialBoard);
    let queue = [{ board: new Int8Array(initialBoard), history: [] }];
    let visited = new Set();
    visited.add(getBitmask(initialBoard, playableMap));

    // Stats
    let statesExamined = 0;
    let maxQueueSize = 0;

    console.log(`AI Starting... Mode: ${isParMode ? 'PAR (Multi-jump)' : 'SIMPLE (Single-jump)'}`);

    while (queue.length > 0) {
        // 1. Check Timeout (10 Seconds)
        if (Date.now() - startTime > 10000) {
            console.warn("AI Timeout reached (10s).");
            if (isParMode) {
                console.log("Retrying with Simple BFS (Non-Par)...");
                return solveBFS(initialBoard, goalIdx, false); // Fallback to simple
            }
            return null; // Both failed
        }

        let { board, history } = queue.shift();
        statesExamined++;
        maxQueueSize = Math.max(maxQueueSize, queue.length);

        // 2. Win Check
        const currentPegs = [];
        for (let i = 0; i < 81; i++) if (board[i] === 1) currentPegs.push(i);

        if (currentPegs.length === 1) {
            if (goalIdx === -1 || currentPegs[0] === goalIdx) {
                // SUCCESS STATS
                console.table({
                    "Result": "Success!",
                    "Total Moves (Swaps)": history.length,
                    "States Examined": statesExamined,
                    "Max Queue Size": maxQueueSize,
                    "Visited Set Size": visited.size,
                    "Time (ms)": Date.now() - startTime
                });
                return history;
            }
        }

        // 3. Move Generator
        for (const i of currentPegs) {
            const moves = getMovesForPeg(board, i, isParMode);
            for (const move of moves) {
                const mask = getBitmask(move.finalBoard, playableMap);
                if (!visited.has(mask)) {
                    visited.add(mask);
                    queue.push({
                        board: move.finalBoard,
                        history: [...history, { path: move.path, captured: move.captured }]
                    });
                }
            }
        }
    }

    console.error("No solution found.");
    return null;
}
