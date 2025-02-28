import '../styles/components/VocabPopover.css';
import { Loader2 } from 'lucide-react';

interface VocabPopoverProps {
  curr_word: string;
  isLoading?: boolean;
  noResult?: boolean;
  part_of_speech?: string;
  phonetic?: string;
  english_definition?: string;
  chinese_definition?: string;
  english_example?: string;
  chinese_example?: string;
  position: {
    x: number;
    y: number;
  };
  onClose: () => void;
}

export const VocabPopover = ({
  curr_word,
  isLoading = false,
  noResult = false,
  part_of_speech,
  phonetic,
  english_definition,
  chinese_definition,
  english_example,
  chinese_example,
  position,
  onClose,
}: VocabPopoverProps) => {
  return (
    <div 
      className="vocab-popover"
      style={{
        left: position.x,
        top: position.y
      }}
    >
      <div className="vocab-header">
        <h3 className="vocab-word">{curr_word}</h3>
        {!isLoading && phonetic && <span className="vocab-phonetic">{phonetic}</span>}
      </div>
      
      {isLoading ? (
        <div className="loading-container">
          <Loader2 className="loading-spinner" />
        </div>
      ) : noResult ? (
        <div className="no-result">
          <p>No Result</p>
        </div>
      ) : (
        <>
          {part_of_speech && <div className="vocab-pos">{part_of_speech}</div>}
          <div className="vocab-definitions">
            {english_definition && <p className="vocab-english">{english_definition}</p>}
            {chinese_definition && <p className="vocab-chinese">{chinese_definition}</p>}
          </div>
          {(english_example || chinese_example) && (
            <div className="vocab-examples">
              {english_example && <p className="example-english">{english_example}</p>}
              {chinese_example && <p className="example-chinese">{chinese_example}</p>}
            </div>
          )}
        </>
      )}
      <button className="close-button" onClick={onClose}>×</button>
    </div>
  );
}; 