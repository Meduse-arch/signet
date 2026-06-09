import React from 'react';

interface RunicDecoderProps {
 text: string;
}

const RUNIC_MAP: Record<string, string> = {
 'A': 'ᚨ', 'B': 'ᛒ', 'C': 'ᚲ', 'D': 'ᛞ', 'E': 'ᛖ', 'F': 'ᚠ', 'G': 'ᚷ', 'H': 'ᚺ',
 'I': 'ᛁ', 'J': 'ᛃ', 'K': 'ᚲ', 'L': 'ᛚ', 'M': 'ᛗ', 'N': 'ᚾ', 'O': 'ᛟ', 'P': 'ᛈ',
 'Q': 'ᚲ', 'R': 'ᚱ', 'S': 'ᛊ', 'T': 'ᛏ', 'U': 'ᚢ', 'V': 'ᚢ', 'W': 'ᚹ', 'X': 'ᛉ',
 'Y': 'ᛇ', 'Z': 'ᛉ'
};

export const RunicDecoder: React.FC<RunicDecoderProps> = ({ text }) => {
 const runicText = text.toUpperCase().split('').map(char => RUNIC_MAP[char] || char).join('');

 return (
 <div className="flex flex-col items-center">
 <span className="text-glacier-bright font-quantico text-xs tracking-[0.2em]">{text}</span>
 <span className="text-silver-bright opacity-40 text-xs tracking-[0.5em] mt-1">{runicText}</span>
 </div>
 );
};

export default RunicDecoder;
