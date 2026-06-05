import { BannerActionType } from './enums/banner-action-type.enum';
import { LocalizedText } from './mobile-config';

export interface BannerItem {
  id: string;
  imageUrl: string;
  actionType: BannerActionType;
  actionValue: string; // Category ID, Product ID, URL etc.
  title?: LocalizedText;
  subtitle?: LocalizedText;
  requireConfirmation?: boolean; // Show explanation modal before action?
  confirmationText?: LocalizedText; // Explanation text
  confirmationButtonText?: LocalizedText; // Button text inside modal
}

export interface Banner {
  id: string;
  name: string;
  slug: string;
  slideDuration: number; // Transition duration in ms (e.g. 3000)
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:1'; // Aspect ratio standard
  items: BannerItem[];
  createdAt: Date;
  updatedAt: Date;
}
