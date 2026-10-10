import Icon from './Icon';
import './ChapterArt.css';

// Decorative stationery echoes the landing page without hiding any page content.
export default function ChapterArt({ compact = false }) {
  return (
    <div className={`chapter-art${compact ? ' chapter-art--compact' : ''}`} aria-hidden="true">
      <div className="chapter-art__shape" />
      <div className="chapter-art__sun" />
      <svg className="chapter-art__sprig" viewBox="0 0 100 180" fill="none">
        <g stroke="currentColor" strokeWidth="1.4">
          <path d="M44 175C40 122 72 66 59 9" />
          <path d="M57 36C39 31 37 18 42 6c15 7 20 18 15 30ZM60 60C75 49 83 33 77 22c-14 10-20 22-17 38ZM57 82C35 78 25 62 28 48c20 6 28 16 29 34ZM51 107C70 96 84 83 83 68c-18 3-31 18-32 39ZM45 132C26 123 17 111 19 94c19 8 28 19 26 38ZM43 156C63 144 76 131 75 116c-18 6-30 19-32 40Z" />
        </g>
      </svg>
      <div className="chapter-art__paper">
        <span className="chapter-art__icon">
          <Icon name="book" size={24} />
        </span>
        <span className="chapter-art__rule" />
        <span className="chapter-art__rule chapter-art__rule--short" />
        <span className="chapter-art__check">
          <Icon name="check" size={13} />
          <i />
        </span>
        <span className="chapter-art__check">
          <Icon name="check" size={13} />
          <i />
        </span>
      </div>
      <span className="chapter-art__spark">✳</span>
      <span className="chapter-art__label">
        <Icon name="leaf" size={17} /> Room to grow.
      </span>
    </div>
  );
}
