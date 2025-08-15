import { Component, ElementRef, ViewChild, Input, OnInit, OnDestroy } from '@angular/core';
import { CardCacheService, CardStackConfig } from '../../services/card-cache.service';
import {CommonModule} from "@angular/common";
@Component({
  selector: 'app-cached-card-backs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './canvas-card-backs.component.html',
  styleUrl: './canvas-card-backs.component.scss'
})
export class CachedCardBacksComponent implements OnInit, OnDestroy {
  @ViewChild('displayCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() cardBackImageSrc: string = 'images/cards/carte_spate.png';
  @Input() cardWidth: number = 40;
  @Input() cardHeight: number = 60;
  @Input() offsetX: number = 30;
  @Input() offsetY: number = 2;
  @Input() fanAngle: number = 0;
  @Input() maxCachedCards: number = 8;
  @Input() showCacheInfo: boolean = false;

  isLoading = false;
  cacheStats = { size: 0, keys: [] as string[] };

  private ctx!: CanvasRenderingContext2D;
  private config!: CardStackConfig;

  constructor(private cardCacheService: CardCacheService) {}

  async ngOnInit(): Promise<void> {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.config = {
      cardWidth: this.cardWidth,
      cardHeight: this.cardHeight,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      fanAngle: this.fanAngle
    };

    await this.initializeCache();
  }

  ngOnDestroy(): void {
    // Optionally clear cache on component destroy
    // this.cardCacheService.clearCache();
  }

  private async initializeCache(): Promise<void> {
    this.isLoading = true;
    try {
      await this.cardCacheService.preGenerateCache(
          this.maxCachedCards,
          this.config,
          this.cardBackImageSrc
      );
      this.updateCacheStats();
    } catch (error) {
      console.error('Failed to initialize card cache:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Fast method to get card backs - uses cache if available
  async getCardBacks(nrOfCards: number, fanned: boolean = false): Promise<void> {
    if (this.isLoading) {
      console.warn('Cache is still loading, please wait...');
      return;
    }

    // Try to get from cache first
    const cachedCanvas = this.cardCacheService.getCachedCardStack(
        nrOfCards,
        this.config,
        fanned
    );

    if (cachedCanvas) {
      // Use cached version - super fast!
      this.displayCachedCanvas(cachedCanvas);
    } else {
      // Generate on-demand for cards outside cache range
      console.warn(`Cards ${nrOfCards} not in cache, generating on-demand...`);
      await this.generateOnDemand(nrOfCards, fanned);
    }
  }

  private displayCachedCanvas(sourceCanvas: HTMLCanvasElement): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.drawImage(sourceCanvas, 0, 0);
  }

  private  generateOnDemand(nrOfCards: number, fanned: boolean): void {
    // This is a fallback for cards not in cache
    // You could implement the original canvas drawing logic here
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.cardWidth + (nrOfCards - 1) * this.offsetX;
    canvas.height = this.cardHeight + (nrOfCards - 1) * this.offsetY;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Simple placeholder - you'd implement the actual drawing logic
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
        `${nrOfCards} cards (on-demand)`,
        canvas.width / 2,
        canvas.height / 2
    );
  }

  // Method to preload additional cache entries
  async extendCache(maxCards: number): Promise<void> {
    this.isLoading = true;
    await this.cardCacheService.preGenerateCache(maxCards, this.config, this.cardBackImageSrc);
    this.updateCacheStats();
    this.isLoading = false;
  }

  // Update cache statistics
  updateCacheStats(): void {
    this.cacheStats = this.cardCacheService.getCacheStats();
  }

  // Export cached image as data URL
  exportCachedImage(nrOfCards: number, fanned: boolean = false): string | null {
    return this.cardCacheService.getCachedImageAsDataURL(nrOfCards, this.config, fanned);
  }
}
