import { Play, Loader2, Square } from 'lucide-react';
import '../styles/components/TextSelectionPopover.css';

interface TextSelectionPopoverProps {
  text: string;
  position: { x: number; y: number };
  onClose: () => void;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
}

export const TextSelectionPopover = ({
  text,
  position,
  onClose,
  isPlaying,
  onPlay,
  onStop
}: TextSelectionPopoverProps) => {
  return (
    <div 
      className="text-selection-popover"
      style={{
        left: position.x,
        top: position.y
      }}
    >
      <div className="text-content">
        <p className={`selected-text ${isPlaying ? 'playing' : ''}`}>
          {text}
        </p>
      </div>
      <div className="controls">
        {isPlaying ? (
          <button className="control-button" onClick={onStop}>
            <Square className="control-icon" />
            <span>Stop</span>
          </button>
        ) : (
          <button className="control-button" onClick={onPlay}>
            <Play className="control-icon" />
            <span>Play</span>
          </button>
        )}
        {isPlaying && (
          <div className="playing-indicator">
            <Loader2 className="loading-spinner" />
            <span>Playing...</span>
          </div>
        )}
      </div>
      <button className="close-button" onClick={onClose}>×</button>
    </div>
  );
}; 