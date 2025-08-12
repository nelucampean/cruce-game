import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, Suit } from '../../models/card.model';
import { DeckService } from '../../services/deck.service';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  @Input() card!: Card;
  @Input() isPlayable = false;
  @Input() isSelected = false;
  @Input() showBack = false; // For opponent cards
  @Input() isHighlighted = false; // For suggestions or special states
  @Input() isTrump = false; // Highlight trump cards
  @Input() canAnnounceMarriage = false; // For marriage-eligible cards
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showTooltip = true;
  @Input() disabled = false;
  
  @Output() cardClicked = new EventEmitter<Card>();
  @Output() cardHover = new EventEmitter<{ card: Card; hover: boolean }>();

  imageLoaded = false;
  imageError = false;
  isHovered = false;

  constructor(private deckService: DeckService) {}

  onClick() {
    if (this.disabled) return;
    
    if (this.isPlayable && !this.showBack) {
      this.cardClicked.emit(this.card);
    }
  }

  onMouseEnter() {
    this.isHovered = true;
    if (this.showTooltip) {
      this.cardHover.emit({ card: this.card, hover: true });
    }
  }

  onMouseLeave() {
    this.isHovered = false;
    if (this.showTooltip) {
      this.cardHover.emit({ card: this.card, hover: false });
    }
  }

  getCardDescription(): string {
    if (this.showBack) return 'Hidden card';
    
    let description = `${this.getCardDisplayName()} of ${this.getSuitDisplayName()}`;
    
    if (this.card.points > 0) {
      description += ` (${this.card.points} points)`;
    }
    
    if (this.isTrump) {
      description += ' - Trump';
    }
    
    if (this.canAnnounceMarriage) {
      description += ' - Marriage possible';
    }
    
    if (this.isPlayable) {
      description += ' - Playable';
    }
    
    return description;
  }

  getCardDisplayName(): string {
    return this.deckService.getCardDisplayName(this.card);
  }

  getSuitDisplayName(): string {
    return this.deckService.getSuitDisplayName(this.card.suit);
  }

  getSuitName(suit: Suit){
        return this.deckService.getSuitDisplayName(suit);
  }

  getImageUrl(): string {
    if (this.showBack) {
      return this.deckService.getCardBackUrl();
    }
    return this.card.imageUrl;
  }

  getCardClasses(): string {
    const classes = ['card', `card-${this.size}`];
    
    if (this.isSelected) {
      classes.push('selected');
    }
    
    if (this.isPlayable && !this.disabled) {
      classes.push('playable');
    }
    
    if (this.isHighlighted) {
      classes.push('highlighted');
    }
    
    if (this.isTrump) {
      classes.push('trump');
    }
    
    if (this.canAnnounceMarriage) {
      classes.push('marriage-eligible');
    }
    
    if (this.showBack) {
      classes.push('face-down');
    }
    
    if (this.disabled) {
      classes.push('disabled');
    }
    
    if (this.isHovered && !this.disabled) {
      classes.push('hovered');
    }
    
    // Add suit class for styling
    if (!this.showBack) {
      classes.push(`suit-${this.card.suit}`);
    }
    
    // Add value class for special cards
    if (!this.showBack) {
      if (this.card.value === 11) classes.push('ace');
      if (this.card.value === 10) classes.push('ten');
      if (this.card.value === 3 || this.card.value === 4) classes.push('marriage-card');
    }
    
    return classes.join(' ');
  }

  // Get background image style for CSS
  getBackgroundImageStyle(): string {
    if (this.imageLoaded && !this.imageError) {
      return `url('${this.getImageUrl()}')`;
    }
    return 'none';
  }

  // Handle image loading
  onImageLoad() {
    this.imageLoaded = true;
    this.imageError = false;
  }

  onImageError(event: any) {
    console.error('Failed to load card image:', event.target.src);
    this.imageLoaded = false;
    this.imageError = true;
  }

  // Get suit symbol for display
  getSuitSymbol(): string {
    const symbols = {
      [Suit.ROSU]: '♦',
      [Suit.GHINDA]: '♠',
      [Suit.VERDE]: '♣',
      [Suit.DUBA]: '♥'
    };
    return symbols[this.card.suit] || '';
  }

  // Get color for suit
  getSuitColor(): 'red' | 'black' {
    return (this.card.suit === Suit.ROSU || this.card.suit === Suit.DUBA) ? 'red' : 'black';
  }

  // Get card value for display (for fallback when image fails)
  getCardValueDisplay(): string {
    if (this.showBack) return '?';
    
    const valueMap: { [key: number]: string } = {
      2: '2',
      3: 'Q', // Treiar = Queen
      4: 'K', // Pătrar = King  
      9: '9',
      10: '10',
      11: 'A'
    };
    
    return valueMap[this.card.value] || this.card.value.toString();
  }

  // Animation and interaction helpers
  getCardStyle(): any {
    const styles: any = {};
    
    // Add transform for selected/highlighted states
    if (this.isSelected) {
      styles.transform = 'translateY(-10px) scale(1.05)';
    } else if (this.isHighlighted) {
      styles.transform = 'scale(1.02)';
    }
    
    // Add opacity for disabled state
    if (this.disabled) {
      styles.opacity = '0.6';
    }
    
    // Add cursor style
    if (this.isPlayable && !this.disabled) {
      styles.cursor = 'pointer';
    } else if (this.disabled) {
      styles.cursor = 'not-allowed';
    } else {
      styles.cursor = 'default';
    }
    
    return styles;
  }

  // Accessibility
  getAriaLabel(): string {
    if (this.showBack) {
      return 'Face down card';
    }
    
    let label = `${this.getCardDisplayName()} of ${this.getSuitDisplayName()}`;
    
    if (this.isPlayable) {
      label += ', playable card';
    } else if (this.disabled) {
      label += ', not playable';
    }
    
    if (this.isTrump) {
      label += ', trump card';
    }
    
    return label;
  }

  getTabIndex(): number {
    return (this.isPlayable && !this.disabled) ? 0 : -1;
  }

  // Keyboard interaction
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onClick();
    }
  }

  // Focus management
  onFocus() {
    this.isHovered = true;
  }

  onBlur() {
    this.isHovered = false;
  }
}