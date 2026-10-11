import { GiftScene } from './three-scene.js';
import { soundCtrl } from './audio.js';

// Hardcoded fallback photos list ensuring instant rendering even if fetch fails
const DEFAULT_PHOTOS = [
  { id: 1, file: 'photos/photo-01.jpg', aspect: 0.75 },
  { id: 2, file: 'photos/photo-02.jpg', aspect: 1.33 },
  { id: 3, file: 'photos/photo-03.jpg', aspect: 0.75 },
  { id: 4, file: 'photos/photo-04.jpg', aspect: 0.75 },
  { id: 5, file: 'photos/photo-05.jpg', aspect: 1.33 },
  { id: 6, file: 'photos/photo-06.jpg', aspect: 0.75 },
  { id: 7, file: 'photos/photo-07.jpg', aspect: 1.33 },
  { id: 8, file: 'photos/photo-08.jpg', aspect: 0.75 },
  { id: 9, file: 'photos/photo-09.jpg', aspect: 0.75 },
  { id: 10, file: 'photos/photo-10.jpg', aspect: 0.75 },
  { id: 11, file: 'photos/photo-11.jpg', aspect: 0.75 },
  { id: 12, file: 'photos/photo-12.jpg', aspect: 0.75 },
  { id: 13, file: 'photos/photo-13.jpg', aspect: 0.75 },
  { id: 14, file: 'photos/photo-14.jpg', aspect: 1.33 }
];

class App {
  constructor() {
    this.currentScreen = 'intro';
    this.photos = DEFAULT_PHOTOS;
    this.currentPhotoIdx = 0;
    this.giftScene = null;
    this.hasWebGL = false;

    // DOM Elements
    this.screens = {
      intro: document.getElementById('screen-intro'),
      greeting: document.getElementById('screen-greeting'),
      gallery: document.getElementById('screen-gallery'),
      finale: document.getElementById('screen-finale')
    };

    this.canvasContainer = document.getElementById('canvas-container');
    this.cssFallback = document.getElementById('css-fallback');
    this.openingStatus = document.getElementById('opening-status');

    this.btnOpenGift = document.getElementById('btn-open-gift');
    this.btnViewPhotos = document.getElementById('btn-view-photos');
    this.btnFinishGallery = document.getElementById('btn-finish-gallery');
    this.btnBackToGreeting = document.getElementById('btn-back-to-greeting');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnBackToPhotos = document.getElementById('btn-back-to-photos');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.soundIcon = document.getElementById('sound-icon');
    this.soundText = document.getElementById('sound-text');

    // Lightbox
    this.lightbox = document.getElementById('lightbox');
    this.lightboxImg = document.getElementById('lightbox-img');
    this.lightboxCounter = document.getElementById('lightbox-counter');
    this.lightboxClose = document.getElementById('lightbox-close');
    this.lightboxPrev = document.getElementById('lightbox-prev');
    this.lightboxNext = document.getElementById('lightbox-next');
    this.photosGrid = document.getElementById('photos-grid');

    // Touch variables for swipe gestures
    this.touchStartX = 0;
    this.touchStartY = 0;
  }

  async init() {
    this.init3DScene();
    this.initSoundEvents();
    this.initNavigation();
    this.initLightbox();
    await this.loadPhotosData();
    this.renderGallery();
  }

  init3DScene() {
    this.giftScene = new GiftScene(this.canvasContainer);
    this.hasWebGL = this.giftScene.init();

    if (!this.hasWebGL) {
      console.warn('WebGL is unavailable. Falling back to CSS 3D Box.');
      this.canvasContainer.style.display = 'none';
      this.cssFallback.classList.add('active');
    }
  }

  initSoundEvents() {
    // Unlock Web Audio on first interaction anywhere
    const unlockAudio = () => {
      soundCtrl.resume();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    // Sound toggle button
    this.btnSoundToggle.addEventListener('click', () => {
      const isMuted = soundCtrl.toggleMute();
      this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
      this.soundText.textContent = isMuted ? 'Без звука' : 'Звук';
      this.btnSoundToggle.setAttribute(
        'aria-label',
        isMuted ? 'Включить звук' : 'Выключить звук'
      );
    });
  }

  initNavigation() {
    // Open Gift Button Click
    this.btnOpenGift.addEventListener('click', () => {
      this.startGiftOpening();
    });

    // View Photos Button Click
    this.btnViewPhotos.addEventListener('click', () => {
      this.showScreen('gallery');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Finish Gallery -> Finale Screen
    this.btnFinishGallery.addEventListener('click', () => {
      this.showScreen('finale');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Back to Greeting
    this.btnBackToGreeting.addEventListener('click', () => {
      this.showScreen('greeting');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Back to Photos from Finale
    this.btnBackToPhotos.addEventListener('click', () => {
      this.showScreen('gallery');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Restart Greeting from Beginning
    this.btnRestart.addEventListener('click', () => {
      this.restartExperience();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  showScreen(name) {
    this.currentScreen = name;

    // Toggle active screen classes
    Object.keys(this.screens).forEach(key => {
      if (key === name) {
        this.screens[key].classList.add('active');
      } else {
        this.screens[key].classList.remove('active');
      }
    });

    // Dim 3D canvas on gallery to keep photos distinct and focused
    if (name === 'gallery') {
      this.canvasContainer.classList.add('dimmed');
    } else {
      this.canvasContainer.classList.remove('dimmed');
    }
  }

  startGiftOpening() {
    this.btnOpenGift.classList.add('opening-state');
    this.btnOpenGift.innerHTML = '<span>Открываем...</span> <span>✨</span>';
    this.openingStatus.style.display = 'inline-flex';

    if (this.hasWebGL && this.giftScene) {
      this.giftScene.openBox(() => {
        this.openingStatus.style.display = 'none';
        this.showScreen('greeting');
      });
    } else {
      // CSS Fallback animation
      this.cssFallback.classList.add('opened');
      soundCtrl.playRibbonWhoosh();
      setTimeout(() => {
        soundCtrl.playBoxOpeningChime();
        soundCtrl.startAmbientMusic();
      }, 1500);

      setTimeout(() => {
        this.openingStatus.style.display = 'none';
        this.showScreen('greeting');
      }, 4500);
    }
  }

  restartExperience() {
    if (this.hasWebGL && this.giftScene) {
      this.giftScene.resetBox();
    } else {
      this.cssFallback.classList.remove('opened');
    }

    this.btnOpenGift.classList.remove('opening-state');
    this.btnOpenGift.innerHTML = '<span>Открыть подарок</span> <span aria-hidden="true">✨</span>';
    this.openingStatus.style.display = 'none';
    this.showScreen('intro');
  }

  async loadPhotosData() {
    try {
      const res = await fetch('./photos.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.photos = data;
        }
      }
    } catch {
      // Fallback already assigned
    }
  }

  renderGallery() {
    this.photosGrid.innerHTML = '';

    this.photos.forEach((photo, idx) => {
      const card = document.createElement('div');
      card.className = `photo-card ${photo.aspect < 1 ? 'aspect-tall' : ''}`;
      card.setAttribute('role', 'listitem');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Семейная фотография ${idx + 1}`);

      // Skeleton shimmer during image load
      const shimmer = document.createElement('div');
      shimmer.className = 'skeleton-shimmer';
      card.appendChild(shimmer);

      // Image
      const img = document.createElement('img');
      img.src = photo.file;
      img.alt = `Воспоминание ${idx + 1}`;
      img.loading = 'lazy';
      img.style.opacity = '0';

      img.onload = () => {
        shimmer.remove();
        img.style.opacity = '1';
      };

      // Error state fallback
      img.onerror = () => {
        shimmer.remove();
        img.remove();
        const errBox = document.createElement('div');
        errBox.className = 'photo-error-box';
        errBox.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span>Семейная фотография ${idx + 1}</span>
        `;
        card.appendChild(errBox);
      };

      card.appendChild(img);

      // Click & Enter key event
      card.addEventListener('click', () => this.openLightbox(idx));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openLightbox(idx);
        }
      });

      this.photosGrid.appendChild(card);
    });
  }

  initLightbox() {
    this.lightboxClose.addEventListener('click', () => this.closeLightbox());
    this.lightboxPrev.addEventListener('click', () => this.prevPhoto());
    this.lightboxNext.addEventListener('click', () => this.nextPhoto());

    // Close on backdrop click
    this.lightbox.addEventListener('click', (e) => {
      if (e.target === this.lightbox) {
        this.closeLightbox();
      }
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (!this.lightbox.classList.contains('active')) return;

      if (e.key === 'Escape') {
        this.closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        this.prevPhoto();
      } else if (e.key === 'ArrowRight') {
        this.nextPhoto();
      }
    });

    // Touch Swipe Gestures
    this.lightbox.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.lightbox.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - this.touchStartX;
        const deltaY = e.changedTouches[0].clientY - this.touchStartY;

        // Horizontal swipe
        if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX < 0) {
            this.nextPhoto();
          } else {
            this.prevPhoto();
          }
        }
        // Swipe down to dismiss
        else if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX)) {
          this.closeLightbox();
        }
      }
    }, { passive: true });
  }

  openLightbox(idx) {
    this.currentPhotoIdx = idx;
    this.updateLightboxContent();
    this.lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.lightboxClose.focus();
  }

  closeLightbox() {
    this.lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  prevPhoto() {
    this.currentPhotoIdx = (this.currentPhotoIdx - 1 + this.photos.length) % this.photos.length;
    this.updateLightboxContent();
  }

  nextPhoto() {
    this.currentPhotoIdx = (this.currentPhotoIdx + 1) % this.photos.length;
    this.updateLightboxContent();
  }

  updateLightboxContent() {
    const photo = this.photos[this.currentPhotoIdx];
    this.lightboxImg.style.opacity = '0';
    this.lightboxImg.src = photo.file;
    this.lightboxImg.onload = () => {
      this.lightboxImg.style.opacity = '1';
    };
    this.lightboxCounter.textContent = `${this.currentPhotoIdx + 1} / ${this.photos.length}`;
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
