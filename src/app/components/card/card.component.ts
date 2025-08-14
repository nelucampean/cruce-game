import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, Suit } from '../../models/card.model';
import { DeckService } from '../../services/deck.service';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardComponent {
  @Input() card!: Card;
  @Input() isPlayable = false;
  @Input() isSelected = false;
  @Input() showBack = false;
  @Input() isHighlighted = false;
  @Input() isTrump = false;
  @Input() canAnnounceMarriage = false;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showTooltip = true;
  @Input() disabled = false;
  @Input() inTrick = false;
  @Input() isWinner = false;
  @Input() animationClass = '';
  
  @Output() cardClicked = new EventEmitter<Card>();
  @Output() cardHover = new EventEmitter<{ card: Card; hover: boolean }>();

  @HostBinding('class.in-trick') get inTrickClass() {
    return this.inTrick;
  }

  imageLoaded = false;
  imageError = false;
  private isHovered = false;

  constructor(private deckService: DeckService) {}

  onClick(event: Event): void {
    if (this.disabled || this.showBack) {
      event.preventDefault();
      return;
    }
    
    if (this.isPlayable) {
      this.cardClicked.emit(this.card);
    }
  }

  onMouseEnter(): void {
    if (this.disabled || this.showBack) return;
    
    this.isHovered = true;
    if (this.showTooltip) {
      this.cardHover.emit({ card: this.card, hover: true });
    }
  }

  onMouseLeave(): void {
    this.isHovered = false;
    if (this.showTooltip) {
      this.cardHover.emit({ card: this.card, hover: false });
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled || this.showBack) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onClick(event);
    }
  }

  onImageLoad(): void {
    this.imageLoaded = true;
    this.imageError = false;
  }

  onImageError(event: Event): void {
    console.warn('Failed to load card image:', (event.target as HTMLImageElement)?.src);
    this.imageLoaded = false;
    this.imageError = true;
  }

  getCardClasses(): string {
    const classes = [
      'card',
      `card-${this.size}`
    ];
    
    // State classes
    if (this.isSelected) classes.push('selected');
    if (this.isPlayable && !this.disabled) classes.push('playable');
    if (this.isHighlighted) classes.push('highlighted');
    if (this.isTrump) classes.push('trump');
    if (this.canAnnounceMarriage) classes.push('marriage-eligible');
    if (this.showBack) classes.push('card-back');
    if (this.disabled) classes.push('disabled');
    if (this.isWinner) classes.push('winner');
    if (this.imageLoaded && !this.imageError) classes.push('image-loaded');
    
    // Animation classes
    if (this.animationClass) classes.push(this.animationClass);
    
    // Suit and value classes for styling
    if (!this.showBack && this.card) {
      classes.push(`suit-${this.card.suit.toLowerCase()}`);
      
      // Special card classes
      if (this.card.value === 11) classes.push('ace');
      if (this.card.value === 10) classes.push('ten');
      if (this.card.value === 3 || this.card.value === 4) classes.push('marriage-card');
    }
    
    return classes.join(' ');
  }

  getImageUrl(): string {
    if (this.showBack) {
      return this.deckService.getCardBackUrl();
    }
    return this.card?.imageUrl || '';
  }

  getBackgroundImageStyle(): string {
    if (this.imageLoaded && !this.imageError) {
      return `url('${this.getImageUrl()}')`;
    }
    return 'none';
  }

  getCardValueDisplay(): string {
    if (this.showBack || !this.card) return '?';
    
    const valueMap: Record<number, string> = {
      2: '2',
      3: 'Q', // Queen (Treiar)
      4: 'K', // King (Pătrar)
      9: '9',
      10: '10',
      11: 'A'  // Ace
    };
    
    return valueMap[this.card.value] || this.card.value.toString();
  }

  getSuitDisplayName(): string {
    if (!this.card || this.showBack) return '';
    return this.deckService.getSuitDisplayName(this.card.suit);
  }

  getCardDisplayName(): string {
    if (!this.card || this.showBack) return '';
    return this.deckService.getCardDisplayName(this.card);
  }

  getSuitSymbol(): string {
    if (!this.card || this.showBack) return '';
    
    const symbols: Record<Suit, string> = {
      [Suit.ROSU]: '♦',
      [Suit.GHINDA]: '♠',
      [Suit.VERDE]: '♣',
      [Suit.DUBA]: '♥'
    };
    return symbols[this.card.suit] || '';
  }

  getSuitColor(): 'red' | 'black' {
    if (!this.card || this.showBack) return 'black';
    return (this.card.suit === Suit.ROSU || this.card.suit === Suit.DUBA) ? 'red' : 'black';
  }

  getCardDescription(): string {
    if (this.showBack) return 'Face down card';
    if (!this.card) return 'Unknown card';
    
    let description = `${this.getCardDisplayName()} of ${this.getSuitDisplayName()}`;
    
    if (this.card.points > 0) {
      description += ` (${this.card.points} points)`;
    }
    
    const states: string[] = [];
    if (this.isTrump) states.push('Trump');
    if (this.canAnnounceMarriage) states.push('Marriage possible');
    if (this.isPlayable) states.push('Playable');
    if (this.disabled) states.push('Not playable');
    if (this.isWinner) states.push('Winning card');
    
    if (states.length > 0) {
      description += ' - ' + states.join(', ');
    }
    
    return description;
  }

  getAriaLabel(): string {
    return this.getCardDescription();
  }

  getTabIndex(): number {
    return (this.isPlayable && !this.disabled && !this.showBack) ? 0 : -1;
  }

  shouldShowFallback(): boolean {
    return !this.imageLoaded || this.imageError;
  }

  shouldShowBackContent(): boolean {
    return this.showBack && this.shouldShowFallback();
  }

  shouldShowCardContent(): boolean {
    return !this.showBack && this.shouldShowFallback();
  }
}