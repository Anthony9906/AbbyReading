import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import '../styles/components/WordSearchGame.css';

interface WordSearchGameProps {
  isOpen: boolean;
  onClose: () => void;
  words: string[];
  unitTitle: string;
}

const WordSearchGame: React.FC<WordSearchGameProps> = ({ isOpen, onClose, words, unitTitle }) => {
  const [grid, setGrid] = useState<string[][]>([]);
  const [gridSize, setGridSize] = useState<number>(10);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<number[][]>([]);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [startCell, setStartCell] = useState<number[]>([]);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [score, setScore] = useState<number | null>(null);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [foundWordPositions, setFoundWordPositions] = useState<{[word: string]: number[][]}>({});
  
  // 生成单词搜索网格
  useEffect(() => {
    if (words.length > 0) {
      generateWordSearchGrid();
    }
  }, [words]);
  
  const generateWordSearchGrid = () => {
    // 确定网格大小 (至少10x10，或者根据最长单词长度调整)
    const maxWordLength = Math.max(...words.map(word => word.length));
    const size = Math.max(10, maxWordLength + 2);
    setGridSize(size);
    
    // 初始化空网格
    const newGrid: string[][] = Array(size).fill(null).map(() => 
      Array(size).fill(''));
    
    // 放置单词
    const placedWords: string[] = [];
    const directions = [
      [0, 1],   // 水平向右
      [1, 0],   // 垂直向下
      [1, 1],   // 对角线向右下
      [0, -1],  // 水平向左
      [-1, 0],  // 垂直向上
      [-1, -1], // 对角线向左上
      [1, -1],  // 对角线向右上
      [-1, 1]   // 对角线向左下
    ];
    
    // 尝试放置每个单词
    for (const word of words) {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;
      
      while (!placed && attempts < maxAttempts) {
        attempts++;
        
        // 随机选择方向
        const dirIndex = Math.floor(Math.random() * directions.length);
        const [dx, dy] = directions[dirIndex];
        
        // 随机选择起始位置
        const startX = Math.floor(Math.random() * size);
        const startY = Math.floor(Math.random() * size);
        
        // 检查单词是否适合放在这个位置和方向
        if (canPlaceWord(newGrid, word, startX, startY, dx, dy, size)) {
          // 放置单词
          for (let i = 0; i < word.length; i++) {
            const x = startX + i * dx;
            const y = startY + i * dy;
            newGrid[y][x] = word[i].toUpperCase();
          }
          placed = true;
          placedWords.push(word);
        }
      }
    }
    
    // 填充剩余空格
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (newGrid[y][x] === '') {
          // 随机字母 (A-Z)
          newGrid[y][x] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }
    
    setGrid(newGrid);
  };
  
  // 检查单词是否可以放置在指定位置和方向
  const canPlaceWord = (
    grid: string[][], 
    word: string, 
    startX: number, 
    startY: number, 
    dx: number, 
    dy: number, 
    size: number
  ): boolean => {
    for (let i = 0; i < word.length; i++) {
      const x = startX + i * dx;
      const y = startY + i * dy;
      
      // 检查是否超出网格边界
      if (x < 0 || x >= size || y < 0 || y >= size) {
        return false;
      }
      
      // 检查单元格是否已被占用，且不是相同的字母
      if (grid[y][x] !== '' && grid[y][x] !== word[i].toUpperCase()) {
        return false;
      }
    }
    return true;
  };
  
  // 处理单元格鼠标按下事件
  const handleCellMouseDown = (rowIndex: number, colIndex: number) => {
    setIsSelecting(true);
    setStartCell([rowIndex, colIndex]);
    setSelectedCells([[rowIndex, colIndex]]);
    setCurrentWord(grid[rowIndex][colIndex]);
  };
  
  // 处理单元格鼠标进入事件
  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    if (!isSelecting) return;
    
    const [startRow, startCol] = startCell;
    
    // 确定选择方向
    let dx = 0, dy = 0;
    
    // 水平方向
    if (rowIndex === startRow) {
      dx = colIndex > startCol ? 1 : -1;
    } 
    // 垂直方向
    else if (colIndex === startCol) {
      dy = rowIndex > startRow ? 1 : -1;
    } 
    // 对角线方向
    else if (Math.abs(rowIndex - startRow) === Math.abs(colIndex - startCol)) {
      dx = colIndex > startCol ? 1 : -1;
      dy = rowIndex > startRow ? 1 : -1;
    } 
    // 不是有效的方向
    else {
      return;
    }
    
    // 计算选择的单元格
    const newSelectedCells = [];
    let word = '';
    
    const distance = Math.max(
      Math.abs(rowIndex - startRow),
      Math.abs(colIndex - startCol)
    );
    
    for (let i = 0; i <= distance; i++) {
      const r = startRow + i * dy;
      const c = startCol + i * dx;
      
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        newSelectedCells.push([r, c]);
        word += grid[r][c];
      }
    }
    
    setSelectedCells(newSelectedCells);
    setCurrentWord(word);
  };
  
  // 处理单元格鼠标松开事件
  const handleCellMouseUp = () => {
    setIsSelecting(false);
    
    // 检查是否找到了单词
    const wordToCheck = currentWord.toLowerCase();
    
    if (words.includes(wordToCheck) && !foundWords.includes(wordToCheck)) {
      setFoundWords([...foundWords, wordToCheck]);
      // 保存找到单词的位置
      setFoundWordPositions({
        ...foundWordPositions,
        [wordToCheck]: [...selectedCells]
      });
    } else {
      setSelectedCells([]);
    }
    
    setCurrentWord('');
  };
  
  // 检查单元格是否被选中
  const isCellSelected = (rowIndex: number, colIndex: number) => {
    return selectedCells.some(([r, c]) => r === rowIndex && c === colIndex);
  };
  
  // 检查单元格是否属于已找到的单词
  const isCellInFoundWord = (rowIndex: number, colIndex: number) => {
    // 检查单元格是否在任何已找到单词的位置中
    return Object.values(foundWordPositions).some(positions => 
      positions.some(([r, c]) => r === rowIndex && c === colIndex)
    );
  };
  
  // 提交游戏结果
  const handleSubmit = () => {
    const totalScore = Math.round((foundWords.length / words.length) * 100);
    setScore(totalScore);
    setGameCompleted(true);
  };
  
  // 重新开始游戏
  const handleRestart = () => {
    setFoundWords([]);
    setSelectedCells([]);
    setCurrentWord('');
    setScore(null);
    setGameCompleted(false);
    setFoundWordPositions({});
    generateWordSearchGrid();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="word-search-overlay">
      <div className="word-search-container">
        <div className="word-search-header">
          <h2>Word Search: {unitTitle}</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="word-search-content">
          <div className="word-search-grid-container">
            <div 
              className="word-search-grid"
              style={{ 
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                gridTemplateRows: `repeat(${gridSize}, 1fr)`
              }}
              onMouseLeave={() => {
                if (isSelecting) {
                  setIsSelecting(false);
                  setSelectedCells([]);
                  setCurrentWord('');
                }
              }}
            >
              {grid.map((row, rowIndex) => 
                row.map((cell, colIndex) => (
                  <div 
                    key={`${rowIndex}-${colIndex}`}
                    className={`grid-cell ${
                      isCellSelected(rowIndex, colIndex) ? 'selected' : ''
                    } ${
                      isCellInFoundWord(rowIndex, colIndex) ? 'found' : ''
                    }`}
                    onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                    onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                    onMouseUp={handleCellMouseUp}
                  >
                    {cell}
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="word-search-sidebar">
            <div className="word-list">
              <h3>Words to Find: {foundWords.length}/{words.length}</h3>
              <div className="word-list-container">
                {words.map((word, index) => (
                  <div 
                    key={index} 
                    className={`word-item ${foundWords.includes(word) ? 'found' : ''}`}
                  >
                    {foundWords.includes(word) ? <Check size={16} /> : null}
                    {word}
                  </div>
                ))}
              </div>
            </div>
            
            {!gameCompleted ? (
              <button 
                className="submit-button"
                onClick={handleSubmit}
                disabled={foundWords.length === 0}
              >
                Submit
              </button>
            ) : (
              <div className="game-results">
                <h3>Your Score: {score}%</h3>
                <p>You found {foundWords.length} out of {words.length} words!</p>
                <button 
                  className="restart-button"
                  onClick={handleRestart}
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordSearchGame; 