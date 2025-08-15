// card-cache.service.ts
import { Injectable } from '@angular/core';

export interface CardStackConfig {
  cardWidth: number;
  cardHeight: number;
  offsetX: number;
  offsetY: number;
  fanAngle?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CardCacheService {
  private cache = new Map<string, HTMLCanvasElement>();
  private cardBackImage: HTMLImageElement | null = null;
  private imageLoaded = false;

  constructor() {}

  async loadCardBackImage(imageSrc: string): Promise<void> {
    if (this.imageLoaded) return;

    return new Promise((resolve, reject) => {
      this.cardBackImage = new Image();
      this.cardBackImage.onload = () => {
        this.imageLoaded = true;
        resolve();
      };
      this.cardBackImage.onerror = reject;
      this.cardBackImage.src = imageSrc;
    });
  }

  async preGenerateCache(
    maxCards: number = 8,
    config: CardStackConfig,
    imageSrc: string
  ): Promise<void> {
    await this.loadCardBackImage(imageSrc);

    // Generate regular stacked cards (1-8)
    for (let i = 1; i <= maxCards; i++) {
      const cacheKey = this.getCacheKey(i, config, false);
      if (!this.cache.has(cacheKey)) {
        const canvas = this.generateCardStack(i, config, false);
        this.cache.set(cacheKey, canvas);
      }
    }

    // Generate fanned cards (1-8) if fanAngle is specified
    if (config.fanAngle && config.fanAngle > 0) {
      for (let i = 1; i <= maxCards; i++) {
        const cacheKey = this.getCacheKey(i, config, true);
        if (!this.cache.has(cacheKey)) {
          const canvas = this.generateCardStack(i, config, true);
          this.cache.set(cacheKey, canvas);
        }
      }
    }
  }

  getCachedCardStack(
    nrOfCards: number,
    config: CardStackConfig,
    fanned: boolean = false
  ): HTMLCanvasElement | null {
    const cacheKey = this.getCacheKey(nrOfCards, config, fanned);
    return this.cache.get(cacheKey) || null;
  }

  private getCacheKey(
    nrOfCards: number,
    config: CardStackConfig,
    fanned: boolean
  ): string {
    return `${nrOfCards}-${config.cardWidth}-${config.cardHeight}-${config.offsetX}-${config.offsetY}-${config.fanAngle || 0}-${fanned}`;
  }

  private generateCardStack(
    nrOfCards: number,
    config: CardStackConfig,
    fanned: boolean
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    if (fanned && config.fanAngle) {
      // Calculate canvas size for fanned cards - account for rotation bounds
      const canvasSize = this.calculateFannedCanvasSize(nrOfCards, config);
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      this.drawCardsFanned(ctx, nrOfCards, config, canvasSize.offsetX, canvasSize.offsetY);
    } else {
      // Calculate canvas size for stacked cards
      canvas.width = config.cardWidth + (nrOfCards - 1) * config.offsetX;
      canvas.height = config.cardHeight + (nrOfCards - 1) * config.offsetY;
      this.drawCardsStacked(ctx, nrOfCards, config);
    }

    return canvas;
  }

  private drawCardsStacked(
    ctx: CanvasRenderingContext2D,
    nrOfCards: number,
    config: CardStackConfig
  ): void {
    if (!this.cardBackImage) return;

    for (let i = 0; i < nrOfCards; i++) {
      const x = i * config.offsetX;
      const y = i * config.offsetY;

      // Add shadow effect
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.drawImage(
        this.cardBackImage,
        x,
        y,
        config.cardWidth,
        config.cardHeight
      );

      // Reset shadow for next card
      ctx.shadowColor = 'transparent';
    }
  }

  private drawCardsFanned(
    ctx: CanvasRenderingContext2D,
    nrOfCards: number,
    config: CardStackConfig,
    offsetX: number,
    offsetY: number
  ): void {
    if (!this.cardBackImage || !config.fanAngle) return;

    for (let i = 0; i < nrOfCards; i++) {
      // Calculate position with offsetX spacing, adjusted for canvas offset
      const x = offsetX + (i * config.offsetX) + (config.cardWidth / 2);
      const y = offsetY + (i * config.offsetY) + (config.cardHeight / 2);

      // Calculate rotation angle
      const angle = (i - (nrOfCards - 1) / 2) * config.fanAngle * Math.PI / 180;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.drawImage(
        this.cardBackImage,
        -config.cardWidth / 2,
        -config.cardHeight / 2,
        config.cardWidth,
        config.cardHeight
      );

      ctx.restore();
    }
  }

  private calculateFannedCanvasSize(nrOfCards: number, config: CardStackConfig): {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } {
    if (!config.fanAngle) {
      return {
        width: config.cardWidth + (nrOfCards - 1) * config.offsetX,
        height: config.cardHeight + (nrOfCards - 1) * config.offsetY,
        offsetX: 0,
        offsetY: 0
      };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    // Calculate bounds for each rotated card
    for (let i = 0; i < nrOfCards; i++) {
      const cardCenterX = (i * config.offsetX) + (config.cardWidth / 2);
      const cardCenterY = (i * config.offsetY) + (config.cardHeight / 2);
      const angle = (i - (nrOfCards - 1) / 2) * config.fanAngle * Math.PI / 180;

      // Calculate the 4 corners of the rotated card
      const halfWidth = config.cardWidth / 2;
      const halfHeight = config.cardHeight / 2;

      const corners = [
        { x: -halfWidth, y: -halfHeight }, // top-left
        { x: halfWidth, y: -halfHeight },  // top-right
        { x: halfWidth, y: halfHeight },   // bottom-right
        { x: -halfWidth, y: halfHeight }   // bottom-left
      ];

      // Rotate each corner and find the bounds
      corners.forEach(corner => {
        const rotatedX = corner.x * Math.cos(angle) - corner.y * Math.sin(angle);
        const rotatedY = corner.x * Math.sin(angle) + corner.y * Math.cos(angle);

        const finalX = cardCenterX + rotatedX;
        const finalY = cardCenterY + rotatedY;

        minX = Math.min(minX, finalX);
        maxX = Math.max(maxX, finalX);
        minY = Math.min(minY, finalY);
        maxY = Math.max(maxY, finalY);
      });
    }

    // Add some padding for shadows and ensure minimum size
    const padding = 10;
    const width = Math.max(maxX - minX + padding * 2, config.cardWidth);
    const height = Math.max(maxY - minY + padding * 2, config.cardHeight);

    return {
      width: Math.ceil(width),
      height: Math.ceil(height),
      offsetX: Math.ceil(Math.abs(minX) + padding),
      offsetY: Math.ceil(Math.abs(minY) + padding)
    };
  }
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cached image as data URL (for debugging or export)
  getCachedImageAsDataURL(
    nrOfCards: number,
    config: CardStackConfig,
    fanned: boolean = false
  ): string | null {
    const canvas = this.getCachedCardStack(nrOfCards, config, fanned);
    return canvas ? canvas.toDataURL() : null;
  }
}
